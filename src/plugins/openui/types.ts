/**
 * The shapes the OpenUI plugin passes around: what a program in the log *is*,
 * what a parse says about it, what an interaction the human made looks like,
 * and what each of the eleven tools answers with.
 *
 * A program is the unit. A tool call is only what did something to a program,
 * so every details object names the program it acted on and carries enough of
 * what the store held to paint a row after the program is gone.
 */

import type { ToolRowCell } from "../core/lib/ui/toolRowPaint";

/** The one status vocabulary the eleven tools answer in. */
export type OpenUIToolStatus = "ok" | "failed" | "empty" | "unknown" | "open";

/**
 * What a program may call the state of one line of work: a section it settled,
 * a todo it is on, a stage a job reached.
 *
 * The words a program writes are wider than this — `components/library/rows.ts`
 * folds the aliases in — and every mark is drawn from this one list, in
 * `lib/theme.ts`.
 */
export type ProgramStatus =
  "done" | "running" | "current" | "pending" | "skipped" | "error";

/** One rejection of a program: a component the library has no name for, a
 * required argument that never arrived, a reference that stayed a name. */
export interface OpenUIDiagnostic {
  code: string;
  component: string;
  path: string;
  message: string;
  severity: "error" | "warning";
}

/** What the parse of one source answers: the tree plus everything said about it. */
export interface OpenUIProgramParse {
  ok: boolean;
  incomplete: boolean;
  statements: number;
  components: string[];
  unresolved: string[];
  orphaned: string[];
  diagnostics: OpenUIDiagnostic[];
  variables: Record<string, unknown>;
  queries: OpenUIQueryInfo[];
}

/** One interaction the human produced in a drawn program. */
export interface OpenUIEventRecord {
  /** When it happened, so a queue read years later still reads in order. */
  at: number;
  /** click, submit, selection, switch, slider, input, open, assistant */
  type: string;
  /** What it was, in the human's words: the button's label, the chosen option. */
  message: string;
  params?: Record<string, unknown>;
  formState?: Record<string, unknown>;
  formName?: string;
}

/** A `$variable` as the human left it. */
export interface OpenUIValueRow {
  name: string;
  value: string;
}

/** One component of this app's library, as `openui-library` reads it. */
export interface OpenUIComponentInfo {
  name: string;
  group: string;
  signature: string;
  description: string;
  props: OpenUIPropInfo[];
}

/** One argument of one component: what it takes, and whether it must be given. */
export interface OpenUIPropInfo {
  name: string;
  type: string;
  required: boolean;
}

/** One group of the library: what belongs together and what the group teaches. */
export interface OpenUIGroupInfo {
  name: string;
  components: string[];
  notes: string[];
}

/** A program in the log, as a tool or a row reads it. */
export interface OpenUIProgramInfo {
  name: string;
  chars: number;
  lines: number;
  streaming: boolean;
  statements: number;
  components: number;
  unresolved: number;
  errors: number;
  waiting: number;
  live: boolean;
  drawn: boolean;
}

/** What a program's data is: the tool name and the arguments its Query used. */
export interface OpenUIQueryInfo {
  statementId: string;
  tool: string;
  served: boolean;
}

export interface OpenUIPromptDetails {
  status: OpenUIToolStatus;
  error: string;
  chars: number;
  root: string;
  components: number;
  groups: string[];
  tools: string[];
  examples: number;
  editMode: boolean;
}

export interface OpenUILibraryDetails {
  status: OpenUIToolStatus;
  error: string;
  name: string;
  root: string;
  count: number;
  omitted: number;
  groups: OpenUIGroupInfo[];
  components: OpenUIComponentInfo[];
}

export interface OpenUIValidateDetails {
  status: OpenUIToolStatus;
  error: string;
  ok: boolean;
  name: string;
  chars: number;
  statements: number;
  components: string[];
  unresolved: string[];
  orphaned: string[];
  incomplete: boolean;
  diagnostics: OpenUIDiagnostic[];
  queries: OpenUIQueryInfo[];
  values: OpenUIValueRow[];
}

export interface OpenUIProgramDetails {
  status: OpenUIToolStatus;
  error: string;
  ok: boolean;
  name: string;
  chars: number;
  chunkChars: number;
  statements: number;
  components: number;
  unresolved: string[];
  diagnostics: OpenUIDiagnostic[];
  incomplete: boolean;
  streaming: boolean;
  live: boolean;
  drawn: boolean;
  waiting: number;
  queries: OpenUIQueryInfo[];
}

export interface OpenUIStateDetails {
  status: OpenUIToolStatus;
  error: string;
  name: string;
  source: string;
  truncated: boolean;
  streaming: boolean;
  live: boolean;
  drawn: string[];
  unresolved: string[];
  errors: OpenUIDiagnostic[];
  values: OpenUIValueRow[];
  waiting: number;
  queries: OpenUIQueryInfo[];
  failures: string[];
  statements: number;
}

export interface OpenUIEventsDetails {
  status: OpenUIToolStatus;
  error: string;
  name: string;
  events: OpenUIEventRecord[];
  waiting: number;
  omitted: number;
  cleared: boolean;
}

export interface OpenUIFixturesDetails {
  status: OpenUIToolStatus;
  error: string;
  names: string[];
  cleared: boolean;
  chars: number;
  refreshed: number;
}

export interface OpenUIListDetails {
  status: OpenUIToolStatus;
  error: string;
  programs: OpenUIProgramInfo[];
  count: number;
  showing: string;
}

export interface OpenUISwitchDetails {
  status: OpenUIToolStatus;
  error: string;
  name: string;
  showing: string;
  programs: OpenUIProgramInfo[];
}

export interface OpenUIClearDetails {
  status: OpenUIToolStatus;
  error: string;
  names: string[];
  removed: number;
  remaining: string[];
}

/**
 * The folded view a row is painted from: every tool's answer reduced to the
 * same cells, counts and lists, so `OpenUIToolRows` never reaches into a
 * tool's own details shape.
 */
export interface OpenUIToolView {
  tool: string;
  status: OpenUIToolStatus;
  ok: boolean;
  name: string;
  headline: string;
  cells: ToolRowCell[];
  programs: OpenUIProgramInfo[];
  components: OpenUIComponentInfo[];
  diagnostics: OpenUIDiagnostic[];
  events: OpenUIEventRecord[];
  values: OpenUIValueRow[];
  drawn: string[];
  names: string[];
  omitted: number;
  streaming: boolean;
  live: boolean;
  waiting: number;
  drawnProgram: boolean;
}
