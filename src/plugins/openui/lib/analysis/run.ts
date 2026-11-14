/**
 * Running a program: evaluating its tree against the values the human left,
 * fetching what its `Query` calls ask for, and carrying out the steps an action
 * prop names.
 *
 * One runtime per program, held outside React: the query manager has to keep
 * its cache across paints and survive the row that painted it, and a fixture
 * served by `openui-tools` has to reach the queries that are already waiting.
 */

import {
  createQueryManager,
  evaluate,
  evaluateRoot,
  type ElementNode,
  type ParseResult,
  type QueryManager,
  type QueryNode,
  type QuerySnapshot,
  type ToolProvider,
} from "@openuidev/lang-core";

import type { OpenUIDiagnostic, OpenUIQueryInfo } from "../../types";
import { beginLoadReport, takeLoadReports } from "../data/source";
import { programStore } from "../programStore/store";
import { librarySchema, openUILibrary } from "../schema/library";

type Ast = Parameters<typeof evaluate>[0];

/** What one paint of a program answers with. */
export interface ProgramEvaluation {
  root: ElementNode | null;
  queries: OpenUIQueryInfo[];
  failures: string[];
  loading: string[];
  renderErrors: OpenUIDiagnostic[];
}

/** The data a program's `Query` calls read: whatever `openui-tools` served. */
const fixtureProvider = (): ToolProvider => ({
  async callTool(name: string): Promise<unknown> {
    const fixtures = programStore.getFixtures();
    if (!(name in fixtures))
      throw new Error(
        `no data is served for "${name}": openui-tools has never been given that name`,
      );
    return fixtures[name];
  },
});

interface ProgramRuntime {
  qm: QueryManager;
  /** The queries this runtime was last given, so a paint can tell served from missing. */
  tools: Record<string, string>;
  /** What it was last asked for, so a repaint does not ask for it a second time. */
  asked: string;
  /** Bumped whenever an answer moves, so a paint can tell its data went stale. */
  answers: number;
}

const runtimes = new Map<string, ProgramRuntime>();

function runtimeFor(name: string): ProgramRuntime {
  const existing = runtimes.get(name);
  if (existing !== undefined) return existing;
  const created: ProgramRuntime = {
    qm: createQueryManager(fixtureProvider()),
    tools: {},
    asked: "",
    answers: 0,
  };
  // A query that answers after the paint has to bring the screen back, since
  // the store cannot hear about data it did not fetch. The count is what makes
  // that answer a different paint rather than the same memoised one.
  created.qm.subscribe(() => {
    created.answers += 1;
    programStore.touch();
  });
  runtimes.set(name, created);
  return created;
}

/** How many times a program's queries have answered since it entered the log.
 *
 * A paint reads what they answered, so this is one of the things a paint is
 * keyed on: without it a late answer repaints nothing and the screen keeps its
 * defaults, and a failure stays unpublished.
 */
export function queryAnswersOf(name: string): number {
  return runtimes.get(name)?.answers ?? 0;
}

/** What one paint asks of the queries, as one string. */
const askedOf = (nodes: QueryNode[]): string =>
  JSON.stringify(
    nodes.map((node) => [
      node.statementId,
      node.toolName,
      node.args,
      node.deps,
      node.defaults,
      node.refreshInterval,
      node.complete,
    ]),
  );

/** A program left the log: its data cache goes with it. */
export function dropRuntime(name: string): void {
  const existing = runtimes.get(name);
  if (existing === undefined) return;
  existing.qm.dispose();
  runtimes.delete(name);
}

/** The data a program reads changed: what its queries answered is stale. */
export function refreshQueries(): void {
  for (const runtime of runtimes.values()) runtime.qm.invalidate();
}

/** Reading one `$variable` of a program. */
type StateRead = (variable: string) => unknown;

/** Reading a `$variable`: a query's answer when it has one, otherwise what the
 *  human left, otherwise nothing.
 *
 * `$rows = Query(...)` is not a state declaration — the language keeps what it
 * answered in the query snapshot, and a `$rows` written in the program is read
 * from there. A read that only knows the declared values draws every
 * query-backed list empty, which is the whole point of a `Query` missed.
 */
const stateReader =
  (values: Record<string, unknown>, snapshot?: QuerySnapshot): StateRead =>
  (variable: string) =>
    snapshot !== undefined && variable in snapshot
      ? snapshot[variable]
      : (values[variable] ?? null);

/** A query the screen can draw from: it answered, and it is not still asking. */
function answered(snapshot: QuerySnapshot, statementId: string): boolean {
  return (
    snapshot[statementId] !== undefined &&
    !snapshot.__openui_loading.includes(statementId) &&
    !snapshot.__openui_errors.some((error) => error.statementId === statementId)
  );
}

/**
 * The language's functions, as the evaluator runs them.
 *
 * A library function is declared once and run at paint time; the evaluator only
 * calls it when the runtime hands it the entry, so the schema entry and the
 * definition's own `fn` are paired here. mu's programs get one function today —
 * `Load(path)` — and it is what keeps a table of 200 rows out of the model's
 * output.
 */
/** The evaluator's own shape for a function entry — schema plus its `fn`. */
type FunctionTable = NonNullable<
  Parameters<typeof evaluateRoot>[1]["ctx"]["functions"]
>;

const functionTable = (): FunctionTable =>
  Object.fromEntries(
    Object.entries(librarySchema.functions ?? {}).map(([name, entry]) => {
      const defined = openUILibrary.functions?.[name];
      return [
        name,
        {
          ...(entry as object),
          fn:
            (defined?.fn as ((args: Record<string, unknown>) => unknown) | undefined) ??
            (() => null),
        },
      ];
    }),
  ) as FunctionTable;

const evalNode = (node: unknown, read: StateRead): unknown => {
  if (node === null || node === undefined) return undefined;
  return evaluate(node as Ast, {
    getState: read,
    resolveRef: () => null,
  });
};

/** Evaluate a program's tree against the values the human left it at.
 *
 * `result` is the prepared parse; without one it is the showing program's, and a
 * program that is not showing has none — it still has values, so it reads.
 */
export function evaluateProgram(
  name: string,
  result?: ParseResult | null,
  values: Record<string, unknown> = programStore.valuesOf(
    programStore.get(name),
  ),
): ProgramEvaluation {
  const runtime = runtimeFor(name);
  const renderErrors: OpenUIDiagnostic[] = [];
  const parsed = result ?? programStore.get(name)?.result ?? null;

  if (parsed === null) {
    return {
      root: null,
      queries: [],
      failures: [],
      loading: [],
      renderErrors,
    };
  }

  // What one query asks may itself read another query's answer, so the ask is
  // read with the answers already in hand.
  const asking = stateReader(values, runtime.qm.getSnapshot());
  const nodes: QueryNode[] = parsed.queryStatements.map((query) => {
    const tool = String(evalNode(query.toolAST, asking) ?? "");
    runtime.tools[query.statementId] = tool;
    // The fourth argument of `Query(name, args, default, refresh)` is how often
    // the data is asked for again, in seconds: the program says it, and the
    // manager keeps asking — a screen that watches a build does not have to be
    // re-rendered to stay current.
    const refresh = Number(evalNode(query.refreshAST, asking) ?? 0);
    return {
      statementId: query.statementId,
      toolName: tool,
      args: evalNode(query.argsAST, asking) ?? {},
      defaults: evalNode(query.defaultsAST, asking) ?? null,
      deps: (query.deps ?? []).map((dep) => asking(dep)),
      ...(Number.isFinite(refresh) && refresh > 0
        ? { refreshInterval: refresh }
        : {}),
      complete: query.complete,
    };
  });

  // A program that writes back names its calls the same way it names the ones it
  // reads; the manager has to be told they exist before anything can run them.
  runtime.qm.registerMutations(
    parsed.mutationStatements.map((mutation) => ({
      statementId: mutation.statementId,
      toolName: String(evalNode(mutation.toolAST, asking) ?? ""),
    })),
  );

  // Only ask when the program asks for something new. A repaint that reads the
  // same queries must not fire the fetches again: an answer that failed has no
  // cached data, so asking again would fail again for as long as it is drawn.
  const asked = askedOf(nodes);
  if (asked !== runtime.asked) {
    runtime.asked = asked;
    runtime.qm.evaluateQueries(nodes);
  }

  const snapshot = runtime.qm.getSnapshot();
  // A `Load` that found nothing has no value to put on the screen, and a
  // function of this engine cannot report: the recorder opened here is what the
  // read drains afterwards, so a missing file becomes a line in the program's
  // notes rather than an empty table that looks intentional.
  beginLoadReport();
  const root = evaluateRoot(parsed, {
    ctx: {
      getState: stateReader(values, snapshot),
      resolveRef: (statementId: string) =>
        runtime.qm.getResult(statementId) ?? null,
      functions: functionTable(),
      actions: {},
      reportError: (message: string) =>
        renderErrors.push({
          code: "runtime-error",
          component: "",
          path: "",
          message,
          severity: "warning",
        }),
    },
    library: openUILibrary as never,
    store: null,
    errors: [],
  });

  return {
    root,
    queries: nodes.map((node) => ({
      statementId: node.statementId,
      tool: node.toolName,
      served: answered(snapshot, node.statementId),
    })),
    failures: [
      ...snapshot.__openui_errors.map((error) =>
        error.message === undefined || error.message === ""
          ? `${String(error.code)}: ${String(error.statementId ?? "")}`
          : error.message,
      ),
      ...takeLoadReports(),
    ],
    loading: snapshot.__openui_loading,
    renderErrors,
  };
}

/** Read the `$variable` values an action's steps set, and what it asks of the agent. */
export interface ActionStepOutcome {
  /** Steps that changed the page. */
  set: string[];
  /** Steps that ran a `Mutation` or asked a `Query` again. */
  ran: string[];
  /** What the step asks of the agent: assistant, url, or a custom action name. */
  asked: { type: string; message: string; params: Record<string, unknown> }[];
}

interface StepLike {
  type?: string;
  target?: string;
  valueAST?: unknown;
  targets?: string[];
  name?: string;
  params?: Record<string, unknown>;
  url?: string;
  context?: string;
  message?: string;
  statementId?: string;
  refType?: string;
}

/**
 * Carry out the local half of an action plan — `@Set` and `@Reset` change the
 * page and need nobody else — and hand back the half that waits: an assistant
 * request, a link, a custom action.
 */
export function runActionSteps(
  name: string,
  plan: unknown,
  values: Record<string, unknown>,
): ActionStepOutcome {
  const record = programStore.get(name);
  const outcome: ActionStepOutcome = { set: [], ran: [], asked: [] };
  if (record === undefined) return outcome;

  // A step reads the page the way the screen does, so `@Set(x, @Count(rows))`
  // counts what the query answered rather than what the program declared.
  const read = stateReader(values, runtimes.get(name)?.qm.getSnapshot());
  for (const step of stepsOf(plan)) {
    const handler =
      typeof step.type === "string" ? STEP_HANDLERS[step.type] : undefined;
    if (handler !== undefined)
      handler(name, step, read, outcome, record.parse.variables);
  }
  return outcome;
}

/** The steps of an action plan, however the parser wrapped them. */
const stepsOf = (plan: unknown): StepLike[] =>
  typeof plan === "object" && plan !== null
    ? (((plan as { steps?: unknown }).steps ?? []) as StepLike[])
    : [];

type StepHandler = (
  name: string,
  step: StepLike,
  read: StateRead,
  outcome: ActionStepOutcome,
  declared: Record<string, unknown>,
) => void;

/** `@Set` and `@Reset` change the page here; the rest are only reported. */
const STEP_HANDLERS: Readonly<Record<string, StepHandler>> = {
  // An action step that changes the page is the program changing it, not the
  // human answering a question, so it never marks a field as touched.
  set: (name, step, read, outcome) => {
    if (typeof step.target !== "string") return;
    const value = evalNode(step.valueAST, read);
    programStore.setValue(name, step.target, value, false);
    outcome.set.push(`${step.target}=${String(value)}`);
  },

  reset: (name, step, _read, outcome, declared) => {
    if (!Array.isArray(step.targets)) return;
    for (const target of step.targets)
      programStore.setValue(name, target, declared[target] ?? null, false);
    outcome.set.push(...step.targets);
  },

  // `@Run($save)` runs a Mutation, or asks a Query again. This is the step a
  // program uses to write something back, so it is not a note in the log: the
  // call runs, its result lands in the program's state, and its queries refresh.
  run: (name, step, _read, outcome) => {
    const runtime = runtimes.get(name);
    if (runtime === undefined || typeof step.statementId !== "string") return;
    if (step.refType === "mutation") {
      // A write usually changes what a read would answer, so the screen's
      // queries are asked again once it lands.
      const queries = Object.keys(runtime.qm.getSnapshot()).filter(
        (key) => !key.startsWith("__openui_"),
      );
      void runtime.qm.fireMutation(
        step.statementId,
        {},
        queries.length === 0 ? undefined : queries,
      );
      outcome.ran.push(step.statementId);
      return;
    }
    runtime.qm.invalidate([step.statementId]);
    runtime.asked = "";
    outcome.ran.push(step.statementId);
  },

  continue_conversation: (_name, step, _read, outcome) => {
    outcome.asked.push({
      type: "assistant",
      message: step.message ?? step.context ?? "",
      params: step.context === undefined ? {} : { context: step.context },
    });
  },

  open_url: (_name, step, _read, outcome) => {
    outcome.asked.push({
      type: "open",
      message: step.url ?? "",
      params: { url: step.url ?? "" },
    });
  },

  custom_action: (_name, step, _read, outcome) => {
    if (typeof step.name !== "string") return;
    outcome.asked.push({
      type: step.name,
      message: step.message ?? step.name,
      params: step.params ?? {},
    });
  },
};
