import { resolve } from "node:path";
import type { ToastFn } from "adwaita-gpuix";
import { truncateToWidth } from "../../../../utils/truncate";
import { HOST } from "../../../registry";
import { commandByName, panelPickFor } from "../plugin/surfaces";
import {
  accentOfThemeRow,
  parseInvocation,
  schemeOfThemeRow,
} from "../theme/themeRows";
import {
  draftMode,
  pickMode,
  type ComposerMode,
  type ComposerTarget,
  type PickIntent,
} from "./mode";
import { applyCompletion } from "./pathCompletion";
import { asThinkingLevel } from "./options";
import type { ComposerPanelRow } from "../../components/composer/Composer";
import type { ThemePanelState } from "../../hooks/useThemePanel";
import type { SessionDeleteResult, ThinkingLevel } from "../agent/agentService";
import type { FileDeleteResult } from "../files/deleteFile";
import {
  openNotice,
  type FileOpenResult,
  type OpenTarget,
} from "../files/openFile";

export interface ComposerActionContext {
  mode: ComposerMode;
  toast: ToastFn;

  setInput(text: string): void;
  appendInput(text: string): void;
  setMode(mode: ComposerMode): void;

  themePanel: ThemePanelState;
  runCommand(name: string): void;

  system(text: string): void;
  setModel(ref: string): void;
  setThinking(level: ThinkingLevel): void;
  resumeSession(path: string, done: () => void): void;

  /**
   * The state each open panel built for itself, by target. A panel asked what a
   * pick on its own row does is handed the state it made, and nothing else.
   */
  panelState: ReadonlyMap<ComposerTarget, unknown>;
}

function pickThemeRow(row: ComposerPanelRow, a: ComposerActionContext): void {
  a.setInput("");
  a.setMode(draftMode());
  if (a.mode.kind === "pick" && a.mode.target === "accent") {
    const accent = accentOfThemeRow(row);
    if (accent !== undefined) a.toast(a.themePanel.applyAccent(accent));
    return;
  }
  const scheme = schemeOfThemeRow(row);
  if (scheme !== null) a.toast(a.themePanel.applyScheme(scheme));
}

function pickCommandRow(row: ComposerPanelRow, a: ComposerActionContext): void {
  if (row.kind !== "command") return;
  // A command that names a panel opens it; one that does not is run as a command.
  const to = commandByName(HOST, row.name)?.target ?? null;
  a.setInput("");
  if (to !== null) {
    a.setMode(pickMode(to));
    return;
  }
  a.setMode(draftMode());
  a.runCommand(row.name);
}

function pickPanelRow(
  row: ComposerPanelRow,
  a: ComposerActionContext,
  intent: PickIntent,
): void {
  if (row.kind !== "option") return;
  if (a.mode.kind !== "pick") return;
  switch (a.mode.target) {
    case "model":
      a.setModel(row.key);
      a.setMode(draftMode());
      break;
    case "thinking":
      a.setThinking(asThinkingLevel(row.key));
      a.setMode(draftMode());
      break;
    case "session":
      a.resumeSession(row.key, () => a.setMode(draftMode()));
      break;
    case "file":
      a.appendInput(row.label);
      a.setMode(draftMode());
      break;
    case "path": {
      // The query is the draft, so the completion is written over the path
      // token. Tab completes and stays in the folder so the path can keep
      // growing; Enter commits the path and dismisses the panel, and the draft
      // is left holding it.
      const done = applyCompletion(a.mode.query, row.key);
      a.setInput(done.text);
      const completes = done.isDirectory && intent === "complete";
      a.setMode(completes ? pickMode("path", done.query) : draftMode());
      break;
    }
    case "userMessageHistory":
      a.setInput(row.key);
      a.setMode(draftMode());
      break;
    default: {
      // A panel whose rows mean something of their own — arming a guardrail is a
      // switch, not a choice — says what a pick does, and the composer's list
      // routing stays out of it.
      const pick = panelPickFor(HOST, a.mode.target);
      if (pick === undefined) return;
      pick(row, a.panelState.get(a.mode.target), { toast: a.toast });
      break;
    }
  }
}

export function pickComposerRow(
  row: ComposerPanelRow,
  a: ComposerActionContext,
  intent: PickIntent,
): void {
  if (row.kind === "theme") {
    pickThemeRow(row, a);
    return;
  }
  if (row.kind === "command") {
    pickCommandRow(row, a);
    return;
  }
  pickPanelRow(row, a, intent);
}

export interface ChatCommandContext {
  setMode(mode: ComposerMode): void;
  compact(): void;
  newSession(): void;
  system(text: string): void;
}

export function runChatCommand(name: string, a: ChatCommandContext): void {
  // The panel a command names is the command's whole meaning: `/changes` is the
  // change stack, and the draft is left behind. A command that names no panel is
  // an action on the session, and the commands that do that are core's own.
  const target = commandByName(HOST, name)?.target;
  if (target !== undefined) {
    a.setMode(pickMode(target));
    return;
  }
  if (name === "compact") {
    a.compact();
    return;
  }
  if (name === "new") {
    a.newSession();
    return;
  }
  a.system("Unknown command");
}

export interface ThemeSubmitContext {
  toast: ToastFn;
  system(text: string): void;
  setMode(mode: ComposerMode): void;
  themePanel: ThemePanelState;
}

export function submitThemeCommand(
  text: string,
  a: ThemeSubmitContext,
): boolean {
  const command = a.themePanel.command(text);
  if (command === null) return false;
  if (command.kind === "open") {
    if (command.message !== undefined) a.system(command.message);
    const theme = parseInvocation("theme", text) !== null;
    a.setMode(pickMode(theme ? "theme" : "accent"));
    return true;
  }
  a.toast(
    command.kind === "scheme"
      ? a.themePanel.applyScheme(command.scheme)
      : a.themePanel.applyAccent(command.accent),
  );
  return true;
}

export interface DeleteSessionContext {
  toast: ToastFn;

  openSessionFile(): string | undefined;
  removeSession(path: string): SessionDeleteResult;
}

export interface DeleteFileContext {
  toast: ToastFn;

  removeFile(path: string): FileDeleteResult;
}

export interface OpenFileContext {
  toast: ToastFn;

  /** Hand the file to the desktop's default app; the answer waits for it to start. */
  openFile(path: string): Promise<FileOpenResult>;

  /** Hand the file to the user's editor; the answer waits for the editor to start. */
  editFile(path: string): Promise<FileOpenResult>;
}

/**
 * What one delete key is handed: the panel under the cursor decides what its
 * row is, so a session row and a file row answer with their own remove.
 */
export type PanelDeleteContext = DeleteSessionContext &
  DeleteFileContext & {
    mode: ComposerMode;
  };

/** Every panel answers a failed delete the same way, with the reason it got. */
function deleteFailed(a: { toast: ToastFn }, error?: string): void {
  a.toast(`Delete failed: ${error ?? "unknown error"}`, {
    type: "destructive",
  });
}

const rowName = (row: { label: string }): string =>
  truncateToWidth(row.label, 48);

function deleteSessionRow(
  row: ComposerPanelRow,
  a: DeleteSessionContext,
): void {
  if (row.kind !== "option") return;
  const name = rowName(row);
  const open = a.openSessionFile();
  if (open !== undefined && resolve(open) === resolve(row.key)) {
    a.toast("Cannot delete the session that is open", { type: "warning" });
    return;
  }
  const result = a.removeSession(row.key);
  if (!result.ok) {
    deleteFailed(a, result.error);
    return;
  }
  a.toast(
    result.method === "trash"
      ? `Session moved to trash · ${name}`
      : `Session deleted · ${name}`,
  );
}

/**
 * Delete the file the row names, off the project and out of the list.
 *
 * The toast names the file rather than the folder it sat in: the row already
 * said the path, and the list that no longer holds it is the proof.
 */
function deleteFileRow(row: ComposerPanelRow, a: DeleteFileContext): void {
  if (row.kind !== "option") return;
  const result = a.removeFile(row.key);
  if (!result.ok) {
    deleteFailed(a, result.error);
    return;
  }
  a.toast(`File deleted · ${rowName(row)}`);
}

export function deletePanelRow(
  row: ComposerPanelRow,
  a: PanelDeleteContext,
): void {
  if (a.mode.kind !== "pick") return;
  if (a.mode.target === "session") {
    deleteSessionRow(row, a);
    return;
  }
  if (a.mode.target === "file") deleteFileRow(row, a);
}

/**
 * Hand the file the row names to a program, and say which one it went to.
 *
 * The panel stays open and the cursor stays put: a file is opened to be read,
 * and the list it was picked from is how the next one is picked. The toast is
 * the whole notice — the answer waits for the program to actually start, so a
 * launcher that is not on the road is reported instead of promised.
 */
function handFileRow(
  row: ComposerPanelRow,
  take: (path: string) => Promise<FileOpenResult>,
  a: OpenFileContext,
  target: OpenTarget,
): void {
  if (row.kind !== "option") return;
  const name = rowName(row);
  void take(row.key).then((result) => {
    const notice = openNotice(result, name, target);
    a.toast(notice.message, { type: notice.type });
  });
}

export type PanelOpenContext = OpenFileContext & {
  mode: ComposerMode;
};

/** `o`: the desktop's own answer to the file's type. */
export function openPanelRow(row: ComposerPanelRow, a: PanelOpenContext): void {
  if (a.mode.kind !== "pick") return;
  if (a.mode.target === "file") handFileRow(row, a.openFile, a, "default app");
}

/** `e`: the editor the user asked for. */
export function editPanelRow(row: ComposerPanelRow, a: PanelOpenContext): void {
  if (a.mode.kind !== "pick") return;
  if (a.mode.target === "file") handFileRow(row, a.editFile, a, "editor");
}
