/**
 * pi's own tools, as mu's log sees them.
 *
 * No plugin registers these five: pi hands `read`, `bash`, `edit`, `write` and
 * `codemode` to every session, so core — the one that draws their rows and names
 * the active set to the model — is the one that says what they look like. Their
 * facts used to sit in four places: a mark per tool in the log's icon table, one
 * name set in the read preview, another in the write preview, and a third in the
 * row deciding which answer carried a patch. One file names them.
 *
 * A plugin's tool is never in here. What a plugin's tool looks like travels with
 * the tool it registers — its `icon` in `plugin/manifest.ts`, its rows and preview
 * in its own `ToolRowSurface` — and the host refuses a tool that says neither.
 */

import type { EditToolDetails } from "@earendil-works/pi-coding-agent";
import type { IconName } from "adwaita-gpuix";

import type { ToolTranscriptItem } from "./transcriptState";

/**
 * The tools pi gives every session. mu names them because pi asks which tools are
 * active by name; every other name in the session is a plugin's, read off the
 * host, so a tool can never be declared to the model in one file and implemented
 * in another.
 */
export const PI_TOOL_NAMES: readonly string[] = [
  "read",
  "bash",
  "edit",
  "write",
  "codemode",
];

/** The marks pi's own tools wear, since no registration carries them. */
export const BUILT_IN_TOOL_ICONS: Record<string, IconName> = {
  read: "description",
  bash: "terminal",
  edit: "editDocument",
  write: "noteAdd",
};

/** What a call is drawn with when its tool named no mark. */
export const DEFAULT_TOOL_ICON: IconName = "terminal";

const READ_TOOL = "read";
const WRITE_TOOL = "write";
const EDIT_TOOL = "edit";

/** The tool that quotes a file into the log. */
export const isReadTool = (name: string): boolean =>
  name.toLowerCase() === READ_TOOL;

/** The tool that puts a whole file up, whose arguments are the file. */
export const isWriteTool = (name: string): boolean =>
  name.toLowerCase() === WRITE_TOOL;

/** The tool that edits a file in place and answers with the patch it made. */
export const isEditTool = (name: string): boolean =>
  name.toLowerCase() === EDIT_TOOL;

/**
 * The patch a call left behind.
 *
 * Only pi's own `edit` answers with one, and it answers with `EditToolDetails`,
 * so the shape is named rather than guessed at the row that draws it: a call of
 * that tool whose details are not the ones pi declares is simply a call with no
 * patch to show.
 */
export function patchOfCall(item: ToolTranscriptItem): string | undefined {
  if (!isEditTool(item.name)) return undefined;
  const details = item.details as EditToolDetails | undefined;
  const patch = details?.patch;
  return typeof patch === "string" && patch.trim() !== "" ? patch : undefined;
}
