import type { ComposerPanelRow } from "../core/components/composer/Composer";

/**
 * Every grammar the runtime can load, named by its key in
 * `treeSitter/grammar.ts`. A language is guarded only when a rule names it and
 * a source resolves to it, so the list is what the wasm set supports, not what
 * any one session uses.
 */
export type GuardrailLanguage =
  | "bash"
  | "cpp"
  | "csharp"
  | "css"
  | "go"
  | "ini"
  | "java"
  | "javascript"
  | "php"
  | "powershell"
  | "python"
  | "regex"
  | "ruby"
  | "rust"
  | "tsx"
  | "typescript";

export interface GuardrailRule {
  id: string;

  domain: string;

  message: string;
  language: GuardrailLanguage;

  query: string;

  capture?: string;

  /** The tools this rule reads; every guarded tool of its language when unset. */
  tools?: readonly string[];

  /** The input fields this rule reads; the command keys when unset. */
  fields?: readonly string[];

  filters?: GuardrailFilter[];
}

export interface GuardrailFilter {
  capture?: string;
  regex: string;
  flags?: string;

  not?: boolean;
}

export interface GuardrailHit {
  ruleId: string;
  domain: string;
  message: string;
  tool: string;
  toolCallId: string;

  language: GuardrailLanguage;

  field: string;

  text: string;

  start: number;
  end: number;

  matchText: string;

  engineMs: number;

  blocked: boolean;
  at: number;
}

export type GuardrailEnginePhase =
  "idle" | "loading" | "ready" | "failed" | "unavailable";

export interface GuardrailEngineState {
  phase: GuardrailEnginePhase;
  error?: string;

  bootMs: number;

  grammars: string[];
}

export type GuardrailSkipReason =
  | "off"
  | "unguarded-tool"
  | "empty"
  | "no-rules"
  | "no-grammar"
  | "no-match"
  | "timeout"
  | "engine-failed";

export interface GuardrailEvaluation {
  primary: GuardrailHit | null;

  hits: GuardrailHit[];
  skip: GuardrailSkipReason | null;
  engineMs: number;
  language: GuardrailLanguage | null;

  sources: number;
}

export interface GuardrailsSnapshot {
  armed: boolean;

  disarmed: readonly string[];
  hits: readonly GuardrailHit[];
  engine: GuardrailEngineState;
  ruleCount: number;
  domainCount: number;

  rulesPending: boolean;

  rulesDir: string | null;

  ruleFiles: number;
  ruleErrors: readonly string[];
}

export type GuardrailsListener = () => void;

export interface GuardrailFixtureExpected {
  block: boolean;

  reason_contains?: string;

  note?: string;
}

export interface GuardrailFixtureEvent {
  type?: string;
  toolName?: string;
  toolCallId?: string;
  input?: Record<string, unknown>;
}

export interface GuardrailFixture {
  id: string;

  domain?: string;
  context?: Record<string, unknown>;
  event: GuardrailFixtureEvent;
  expected: GuardrailFixtureExpected;
}

export interface GuardrailFixtureSuite {
  domain: string;
  path: string;
  fixtures: GuardrailFixture[];
  error?: string;
}

export interface GuardrailFixtureOp {
  op: "write" | "delete";
  id: string;
  status: "ok" | "fail";
  detail: string;
}

export interface GuardrailCoverageRow {
  domain: string;

  source: string;
  blocks: number;

  last: string;
  never: boolean;
}

export interface GuardrailsTestDetails {
  dir: string | null;
  domain: string | null;
  fixture: string | null;
  suites: string[];
  engine: GuardrailEngineState;

  note: string;
  pass: number;
  fail: number;
  total: number;
  rows: {
    domain: string;
    id: string;
    command: string;
    field: string;
    want: boolean;
    got: boolean;
    status: "PASS" | "FAIL";
    detail: string;
  }[];
}

export interface GuardrailsFixtureUpdateDetails {
  dir: string | null;
  domain: string;
  path: string;

  before: number;
  ops: { op: string; id: string; status: "ok" | "fail"; detail: string }[];
  written: number;
  deleted: number;
  failed: number;
}

export interface GuardrailsCoverageDetails {
  dir: string;
  files: number;
  windowDays: number;
  ruleCount: number;
  truncated: boolean;
  note: string;
  rows: GuardrailCoverageRow[];
}

export interface GuardrailsPanelApi {
  snapshot: GuardrailsSnapshot;
  rows: readonly ComposerPanelRow[];
  statusText: string;

  toggle(key: string): string;
}
