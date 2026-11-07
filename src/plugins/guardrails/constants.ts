export const GUARDRAILS_COMMAND = "guardrails";
export const GUARDRAILS_PANEL_KEY = "guardrails";
export const GUARDRAILS_OPEN_BINDING = "composer.guardrails";

/** Tools whose command text is guarded, and the keys that hold it. */
export const GUARDED_COMMAND_TOOLS: readonly string[] = [
  "bash",
  "shell",
  "terminal",
  "exec",
  "run",
];
export const COMMAND_INPUT_KEYS: readonly string[] = ["command", "cmd"];

/**
 * Tools whose file text is guarded, the keys that hold it, and the key that
 * names the grammar that text is written in.
 */
export const GUARDED_FILE_TOOLS: readonly string[] = [
  "write",
  "edit",
  "create",
  "multiedit",
  "notebook-edit",
];
export const FILE_TEXT_INPUT_KEYS: readonly string[] = [
  "content",
  "newText",
  "oldText",
  "text",
];
export const PATH_INPUT_KEYS: readonly string[] = ["path", "file", "filePath"];

export const BLOCK_REASON_PREFIX = "blocked(guardrails";

export const PARSE_BUDGET_MS = 25;

export const MAX_GUARDED_BYTES = 64 * 1024;

export const MAX_PANEL_HITS = 24;

export const MAX_PANEL_RULES = 60;

export const GUARDRAILS_TEST_TOOL = "guardrails-test";
export const GUARDRAILS_FIXTURE_TOOL = "guardrails-fixture-update";
export const GUARDRAILS_COVERAGE_TOOL = "guardrails-coverage";

export const GUARDRAILS_DIR_NAME = "guardrails";
export const RULES_DIR_ENV = "MU_GUARDRAILS_RULES";
export const FIXTURES_DIR_ENV = "MU_GUARDRAILS_FIXTURES";
export const FIXTURES_FILE_SUFFIX = ".fixtures.json";
export const STATE_FILE_NAME = "guardrails.json";

export const MAX_TEST_FIXTURES = 400;

export const MAX_FIXTURES_PER_WRITE = 40;

export const COVERAGE_DEFAULT_DAYS = 7;
export const MAX_COVERAGE_FILES = 4_000;

export const BLOCK_MARK = `${BLOCK_REASON_PREFIX}/`;

export const SESSIONS_DIR_NAME = "sessions";
