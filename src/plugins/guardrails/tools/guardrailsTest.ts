import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import type { PluginTool } from "../../core/lib/plugin/manifest";
import { GUARDRAILS_TEST_TOOL, MAX_TEST_FIXTURES } from "../constants";
import { reloadGuardrails } from "../lib/guardrailsExtension";
import {
  fixtureSuites,
  fixturesDirFor,
  fixturesDirLabel,
  runFixture,
} from "../lib/fixtures";
import { rulesDirDisplay } from "../lib/rulesFile";
import { reportSummary, reportTable, yesNo } from "../lib/report";
import { warmGuardrails } from "../lib/engine";
import { engineLabel } from "../lib/panelRows";
import { guardrailsStore } from "../lib/store";
import type {
  GuardrailEngineState,
  GuardrailFixtureSuite,
  GuardrailsTestDetails,
} from "../types";

const TestParametersSchema = Type.Object({
  domain: Type.Optional(
    Type.String({
      minLength: 1,
      pattern: "^\\s*\\S",
      description:
        "Suite to run, named by its domain (e.g. `package-manager`). Empty runs every suite in the directory.",
    }),
  ),
  fixture: Type.Optional(
    Type.String({
      minLength: 1,
      pattern: "^\\s*\\S",
      description:
        "Fixture id to restrict the run to one case (e.g. `block-npm-i`). Requires `domain`.",
    }),
  ),
});

const engineNow = (): GuardrailEngineState =>
  guardrailsStore.getSnapshot().engine;

const suiteNote = (suites: readonly GuardrailFixtureSuite[]): string => {
  const broken = suites.filter((suite) => suite.error !== undefined);
  if (broken.length === 0) return "";
  return `suites with trouble:\n${broken
    .map((suite) => `  ${suite.domain}: ${suite.error}`)
    .join("\n")}`;
};

const missingSuitesNote = (): string =>
  `no suite directory at ${fixturesDirLabel()} — write <domain>.json there, or point MU_GUARDRAILS_FIXTURES at one`;

/**
 * Domains of this run that the panel has disarmed. A suite grades the rule, so
 * these rows pass or fail on their query; the note keeps the run from reading as
 * "this domain is armed and blocking" when the app would release the same hit.
 */
const disarmedNote = (suites: readonly GuardrailFixtureSuite[]): string => {
  const off = guardrailsStore
    .getSnapshot()
    .disarmed.filter((domain) =>
      suites.some((suite) => suite.domain === domain),
    );
  if (off.length === 0) return "";
  return `disarmed in this run: ${off.join(", ")} — the suite proves the rule, not the arming; the app would release these hits`;
};

type TestRow = GuardrailsTestDetails["rows"][number];

/** The details of a run that never started: nothing ran, one note says why. */
function emptyDetails(input: {
  dir: string | null;
  domain: string | null;
  fixture: string | null;
  suites: readonly string[];
  note: string;
}): GuardrailsTestDetails {
  return {
    status: "failed",
    dir: input.dir,
    domain: input.domain,
    fixture: input.fixture,
    suites: [...input.suites],
    engine: engineNow(),
    note: input.note,
    pass: 0,
    fail: 0,
    total: 0,
    rows: [],
  };
}

/** A run refused before it read a fixture: the reason for the model, the shape for the log. */
function rejected(
  text: string,
  details: GuardrailsTestDetails,
): AgentToolResult<GuardrailsTestDetails> {
  return { content: [{ type: "text", text }], details };
}

/** The suites asked for, by the domain they are named by. */
function suitesHere(
  all: readonly GuardrailFixtureSuite[],
  domain?: string,
): readonly GuardrailFixtureSuite[] {
  if (domain === undefined) return all;
  return all.filter((suite) => suite.domain === domain);
}

const domainNames = (suites: readonly GuardrailFixtureSuite[]): string[] =>
  suites.map((suite) => suite.domain);

function noSuiteResult(
  dir: string,
  domain: string,
  fixture: string | undefined,
  all: readonly GuardrailFixtureSuite[],
): AgentToolResult<GuardrailsTestDetails> {
  const here = domainNames(all);
  const note = `no suite named ${domain} in ${dir}`;
  return rejected(
    `guardrails-test: ${note}\nsuites here: ${here.length === 0 ? "none" : here.join(", ")}`,
    emptyDetails({ dir, domain, fixture: fixture ?? null, suites: here, note }),
  );
}

function needsDomainResult(
  dir: string,
  fixture: string,
  all: readonly GuardrailFixtureSuite[],
): AgentToolResult<GuardrailsTestDetails> {
  const note =
    "`fixture` needs `domain` — ids are unique inside a suite, not across the tree";
  return rejected(
    `guardrails-test: ${note}.`,
    emptyDetails({
      dir,
      domain: null,
      fixture,
      suites: domainNames(all),
      note,
    }),
  );
}

function noDirResult(
  domain: string | undefined,
  fixture: string | undefined,
): AgentToolResult<GuardrailsTestDetails> {
  const note = missingSuitesNote();
  return rejected(
    `guardrails-test: ${note}.\nRules are read from ${rulesDirDisplay()}, and their suites from the fixtures directory beside them.`,
    emptyDetails({
      dir: null,
      domain: domain ?? null,
      fixture: fixture ?? null,
      suites: [],
      note,
    }),
  );
}

interface FixtureRun {
  rows: TestRow[];
  pass: number;
  fail: number;
  ran: number;
}

/** Every fixture of every suite asked for, capped so one run stays one page. */
async function runSuites(
  suites: readonly GuardrailFixtureSuite[],
  fixture?: string,
): Promise<FixtureRun> {
  const rows: TestRow[] = [];
  let pass = 0;
  let fail = 0;
  let ran = 0;
  for (const suite of suites) {
    for (const caseOf of suite.fixtures) {
      if (fixture !== undefined && caseOf.id !== fixture) continue;
      if (ran >= MAX_TEST_FIXTURES) break;
      ran += 1;
      const outcome = await runFixture(caseOf);
      if (outcome.status === "PASS") pass += 1;
      else fail += 1;
      rows.push({
        domain: suite.domain,
        id: outcome.id,
        command: outcome.command,
        field: outcome.field,
        want: outcome.want,
        got: outcome.got,
        status: outcome.status,
        detail: outcome.detail,
      });
    }
  }
  return { rows, pass, fail, ran };
}

/**
 * The suite grades the rules **as written**, so a rule edited on disk since the
 * app booted is re-read before a single fixture runs: otherwise a green run
 * proves the rules the app happened to load at start, not the file that was
 * just changed. A file that no longer parses is named here, because its rules
 * are absent from the run rather than silently unchanged.
 */
function rulesNote(): string {
  let loaded: ReturnType<typeof reloadGuardrails>;
  try {
    loaded = reloadGuardrails();
  } catch (error) {
    const why = error instanceof Error ? error.message : String(error);
    return `rule files could not be re-read: ${why} — this run graded the rules the app booted with`;
  }
  if (loaded.errors.length === 0) return "";
  return `rule files with errors, their rules not in this run:\n${loaded.errors
    .map((line) => `  ${line}`)
    .join("\n")}`;
}

/** What a run that proved nothing owes the model: why it proved nothing. */
function runNote(
  run: FixtureRun,
  suites: readonly GuardrailFixtureSuite[],
  domain: string | undefined,
  fixture: string | undefined,
  rules: string,
): string {
  const total = run.pass + run.fail;
  const missing =
    fixture !== undefined && total === 0
      ? `no fixture named ${fixture} in ${domain ?? "any suite"}`
      : "";
  const empty =
    total === 0 && missing === ""
      ? suites.length === 0
        ? "no suites in the directory — a domain's suite is `fixtures/<domain>.json`"
        : "the suites hold no fixtures — every rule needs a block-* case and an ok-* case"
      : "";
  return [rules, missing, empty, suiteNote(suites), disarmedNote(suites)]
    .filter((line) => line !== "")
    .join("\n");
}

/** The run as aligned columns: one row per fixture, then the tally. */
function runReport(
  suites: readonly string[],
  engine: string,
  note: string,
  run: FixtureRun,
): string {
  const total = run.pass + run.fail;
  const tally: (readonly [string, string | number])[] = [
    ["pass", run.pass],
    ["fail", run.fail],
    ["total", total],
  ];
  if (run.ran >= MAX_TEST_FIXTURES) tally.push(["capped", MAX_TEST_FIXTURES]);
  return [
    `guardrails-test · suites ${suites.join(", ") !== "" ? suites.join(", ") : "none"} · ${engine}`,
    note,
    reportTable(
      ["domain", "fixture", "field", "want", "got", "status", "detail"],
      run.rows.map((row) => [
        row.domain,
        row.id,
        row.field,
        yesNo(row.want),
        yesNo(row.got),
        row.status,
        row.detail,
      ]),
    ),
    reportSummary(tally),
  ]
    .filter((block) => block !== "")
    .join("\n\n");
}

async function runGuardrailTests(
  dir: string | null,
  domain?: string,
  fixture?: string,
): Promise<AgentToolResult<GuardrailsTestDetails>> {
  if (dir === null) return noDirResult(domain, fixture);

  const all = fixtureSuites(dir);
  const wanted = suitesHere(all, domain);
  if (domain !== undefined && wanted.length === 0)
    return noSuiteResult(dir, domain, fixture, all);
  if (fixture !== undefined && domain === undefined)
    return needsDomainResult(dir, fixture, all);

  const rules = rulesNote();
  await warmGuardrails();
  const run = await runSuites(wanted, fixture);
  const note = runNote(run, wanted, domain, fixture, rules);
  const suites = domainNames(wanted);

  return {
    content: [
      {
        type: "text",
        text: runReport(suites, engineLabel(engineNow()), note, run),
      },
    ],
    details: {
      // The run's own state, said once: a suite that graded failures is still a
      // call that worked, and only a call that never found fixtures is `empty`.
      status: run.pass + run.fail === 0 ? "empty" : "ok",
      dir,
      domain: domain ?? null,
      fixture: fixture ?? null,
      suites,
      engine: engineNow(),
      note,
      pass: run.pass,
      fail: run.fail,
      total: run.pass + run.fail,
      rows: run.rows,
    },
  };
}

export const guardrailsTestTool: PluginTool<
  typeof TestParametersSchema,
  GuardrailsTestDetails
> = {
  name: GUARDRAILS_TEST_TOOL,
  icon: "rule",
  label: "guardrails test",
  description:
    "Runs the guardrails fixture suites against the live tree-sitter engine and reports " +
    "PASS/FAIL per fixture with a pass/fail/total summary, in a `field` column that names what " +
    "the engine read: `command` for a shell tool, `newText`/`content`/`oldText` for a file tool. " +
    "Each fixture is one tool call and the verdict it deserves: `block-*` cases must be stopped, " +
    "`ok-*` cases must be released, and a `reason_contains` must appear in the reason the model " +
    "is handed. The rule files are re-read before the fixtures run, so a rule edited on disk is " +
    "graded as written. Use it after changing a rule, a query, a filter or a grammar to prove the " +
    "suite still passes.",
  promptSnippet:
    "Run the guardrails fixture suites and report PASS/FAIL per fixture",
  promptGuidelines: [
    "Run guardrails-test after changing a guardrails rule, query or filter; a suite that was green is the proof a rule is safe to ship.",
    "The run re-reads the rule files first, so it grades a rule you edited with a file tool; a domain whose file no longer parses is named in the note and its rules are missing from the run.",
    "Every rule needs one block-* fixture and one ok-* fixture: the first proves the rule fires, the second proves it does not fire on a command that only looks alike.",
    "A suite is a `<domain>.json` file in mu's own guardrails directory under the user's config, next to the rules it proves; run one suite with `domain`, one case with `domain` and `fixture`.",
    "A file-domain fixture is a `write`/`edit` call: its `path` names the grammar the text is parsed in, so a `.py` fixture is checked against python rules and a `.json` path is released unread.",
    'A suite grades the rule, never the arming: a disarmed domain still passes its block-* case, and the run names those domains so a green suite is not read as "this domain is blocking".',
  ],

  executionMode: "sequential",
  parameters: TestParametersSchema,

  async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
    return runGuardrailTests(fixturesDirFor(), params.domain, params.fixture);
  },
};
