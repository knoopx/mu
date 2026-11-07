import { resolve } from "node:path";
import type { ToastFn } from "adwaita-gpuix";
import { truncateToWidth } from "../../../../utils/truncate";
import { coreCommands } from "../commands/coreCommands";
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
} from "./mode";
import { applyCompletion } from "./pathCompletion";
import { asThinkingLevel } from "./options";
import type { ComposerPanelRow } from "../../components/composer/Composer";
import type { ThemePanelState } from "../../hooks/useThemePanel";
import type { SessionDeleteResult, ThinkingLevel } from "../agent/agentService";

const COMMAND_TARGETS: Record<string, ComposerTarget> = {
  model: "model",
  thinking: "thinking",
  changes: "changes",
  guardrails: "guardrails",
};

const COMMAND_MODES: Record<string, ComposerTarget> = {
  model: "model",
  thinking: "thinking",
};

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

  /** Arms or disarms a guardrail row; the text it returns is the toast. */
  toggleGuardrail(key: string): string;
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
  const plugin = coreCommands.find((c) => c.name === row.name);
  const to = plugin?.target ?? COMMAND_TARGETS[row.name] ?? null;
  a.setInput("");
  if (to !== null) {
    a.setMode(pickMode(to));
    return;
  }
  a.setMode(draftMode());
  a.runCommand(row.name);
}

function pickPanelRow(row: ComposerPanelRow, a: ComposerActionContext): void {
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
      // The query is the draft: the completion is written over the path token,
      // and a directory keeps the panel open so the path can keep growing.
      const done = applyCompletion(a.mode.query, row.key);
      a.setInput(done.text);
      a.setMode(done.isDirectory ? pickMode("path", done.query) : draftMode());
      break;
    }
    case "userMessageHistory":
      a.setInput(row.key);
      a.setMode(draftMode());
      break;
    case "guardrails":
      // Arming is a switch, not a choice: the panel stays open and the cursor
      // stays put, so the row can be flipped and read again.
      a.toast(a.toggleGuardrail(row.key));
      break;
  }
}

export function pickComposerRow(
  row: ComposerPanelRow,
  a: ComposerActionContext,
): void {
  if (row.kind === "theme") {
    pickThemeRow(row, a);
    return;
  }
  if (row.kind === "command") {
    pickCommandRow(row, a);
    return;
  }
  pickPanelRow(row, a);
}

export interface ChatCommandContext {
  setMode(mode: ComposerMode): void;
  compact(): void;
  newSession(): void;
  system(text: string): void;
}

export function runChatCommand(name: string, a: ChatCommandContext): void {
  const plugin = coreCommands.find((c) => c.name === name);
  if (plugin !== undefined) {
    a.setMode(
      plugin.target !== undefined ? pickMode(plugin.target) : draftMode(),
    );
    return;
  }
  const target = COMMAND_MODES[name];
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
  remove(path: string): SessionDeleteResult;
}

export function deleteSessionRow(
  row: ComposerPanelRow,
  a: DeleteSessionContext,
): void {
  if (row.kind !== "option") return;
  const name = truncateToWidth(row.label, 48);
  const open = a.openSessionFile();
  if (open !== undefined && resolve(open) === resolve(row.key)) {
    a.toast("Cannot delete the session that is open", { type: "warning" });
    return;
  }
  const result = a.remove(row.key);
  if (!result.ok) {
    a.toast(`Delete failed: ${result.error ?? "unknown error"}`, {
      type: "destructive",
    });
    return;
  }
  a.toast(
    result.method === "trash"
      ? `Session moved to trash · ${name}`
      : `Session deleted · ${name}`,
  );
}
