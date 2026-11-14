/**
 * The input keys of a tool call.
 *
 * Two readers ask the same question of a call: the log paints one and needs to
 * know what it was pointed at, and guardrails reads one and needs to know which
 * of its texts to parse and in what grammar. Both used to keep their own answer
 * — `command`/`cmd` and a path list spelled twice, drifting apart — so the key
 * tables are stated once here.
 *
 * A tool's **name** is deliberately absent: mu's own tool set is fixed by
 * `APP_TOOL_NAMES` in `agentService.ts`, so a list of names can only rot into
 * names no call ever has. Where a name is needed to *guard* a call it stays in
 * the guardrails rule, which is the user's own file and may name a tool this
 * app has never seen.
 */

/** Where a command call carries the command it ran. */
export const COMMAND_INPUT_KEYS: readonly string[] = ["command", "cmd"];

/**
 * Where a file call names the file it writes — the path is what names the
 * grammar a file source is parsed in, so every spelling the providers use is
 * here, not only the ones the app's own tools answer with.
 */
export const PATH_INPUT_KEYS: readonly string[] = [
  "path",
  "file_path",
  "filePath",
  "file",
  "notebook_path",
];

/** Where the text a file call writes sits: a whole new file, or one of its edits. */
export const FILE_TEXT_INPUT_KEYS: readonly string[] = [
  "content",
  "newText",
  "oldText",
  "text",
];

/** The first non-empty text under these keys, in the order they are listed. */
function inputTextOf(
  args: Record<string, unknown> | undefined,
  keys: readonly string[],
): string {
  for (const key of keys) {
    const value = args?.[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return "";
}

/** The command a call ran, whatever answers with it. */
export const commandTextOf = (
  args: Record<string, unknown> | undefined,
): string => inputTextOf(args, COMMAND_INPUT_KEYS);

/** The file a call is pointed at. */
export const pathTextOf = (args: Record<string, unknown> | undefined): string =>
  inputTextOf(args, PATH_INPUT_KEYS);
