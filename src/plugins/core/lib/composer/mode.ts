import { clamp } from "../../../../utils/clamp";

export type ComposerTarget =
  | "model"
  | "thinking"
  | "session"
  | "file"
  | "path"
  | "changes"
  | "oplog"
  | "tree"
  | "theme"
  | "accent"
  | "userMessageHistory"
  | "guardrails"
  | "plugins"
  | "terminal"
  | "projects";

const CYCLE_TARGETS: ComposerTarget[] = ["userMessageHistory"];

export function isCycleTarget(
  target: ComposerTarget | null,
): target is ComposerTarget {
  return target !== null && CYCLE_TARGETS.includes(target);
}
export type ComposerMode =
  | { kind: "draft" }
  | { kind: "commands"; index: number; query: string }
  | { kind: "pick"; target: ComposerTarget; index: number; query: string };

/**
 * How a row under the cursor was taken.
 *
 * Tab completes and leaves the panel where it was, so the next segment can keep
 * growing; Enter commits the row and dismisses the panel. A panel with one
 * answer for both keys ignores the intent — only path completion splits them.
 */
export type PickIntent = "complete" | "commit";

export const draftMode = (): ComposerMode => ({ kind: "draft" });

export const commandsMode = (query = ""): ComposerMode => ({
  kind: "commands",
  index: 0,
  query,
});

export const pickMode = (target: ComposerTarget, query = ""): ComposerMode => ({
  kind: "pick",
  target,
  index: 0,
  query,
});

export type ComposerEvent =
  | { type: "openCommands" }
  | {
      type: "openPick";
      target: ComposerTarget;
      cycle?: boolean;
      count?: number;
    }
  | { type: "openChanges" }
  | { type: "setQuery"; query: string }
  | { type: "move"; delta: number; count: number }
  | { type: "page"; delta: number; pageSize: number; count: number }
  | { type: "first"; count: number }
  | { type: "last"; count: number }
  | { type: "hover"; index: number; count: number }
  | { type: "close" };

type IndexEvent = Extract<
  ComposerEvent,
  { type: "move" | "page" | "first" | "last" | "hover" }
>;

function retainedQuery(mode: ComposerMode, target: ComposerTarget): string {
  return mode.kind === "pick" && mode.target === target ? mode.query : "";
}

function openPick(
  mode: ComposerMode,
  target: ComposerTarget,
  cycle: boolean,
  count: number,
): ComposerMode {
  const alreadyOpen = mode.kind === "pick" && mode.target === target;
  if (cycle && alreadyOpen && mode.kind === "pick") {
    if (count === 0) return mode;
    return { ...mode, index: (mode.index + 1) % count };
  }
  return pickMode(target, alreadyOpen ? mode.query : "");
}

function nextIndex(mode: { index: number }, event: IndexEvent): number {
  switch (event.type) {
    case "move":
      return clamp(mode.index + event.delta, event.count - 1);
    case "page": {
      const page = Math.floor(mode.index / event.pageSize);
      const pages = Math.max(1, Math.ceil(event.count / event.pageSize));
      return clamp(
        clamp(page + event.delta, pages - 1) * event.pageSize,
        event.count - 1,
      );
    }
    case "first":
      return 0;
    case "last":
      return Math.max(0, event.count - 1);
    case "hover":
      return clamp(event.index, event.count - 1);
  }
}

function navigate(mode: ComposerMode, event: IndexEvent): ComposerMode {
  if (mode.kind === "draft" || event.count === 0) return mode;
  return { ...mode, index: nextIndex(mode, event) };
}

export function transition(
  mode: ComposerMode,
  event: ComposerEvent,
): ComposerMode {
  switch (event.type) {
    case "openCommands":
      return commandsMode(mode.kind === "commands" ? mode.query : "");
    case "openPick":
      return openPick(
        mode,
        event.target,
        event.cycle === true,
        event.count ?? 0,
      );
    case "openChanges":
      return pickMode("changes", retainedQuery(mode, "changes"));
    case "setQuery":
      if (mode.kind === "draft") return mode;
      return { ...mode, query: event.query, index: 0 };
    case "close":
      return draftMode();
    default:
      return navigate(mode, event);
  }
}

export function isPanelMode(mode: ComposerMode): boolean {
  return mode.kind !== "draft";
}

/**
 * The completion panel is the draft in another shape: its query is the whole
 * draft, so typing keeps editing the draft and Tab completes the path token the
 * draft ends with. Every other panel owns a query of its own.
 */
export function isCompletionMode(mode: ComposerMode): boolean {
  return mode.kind === "pick" && mode.target === "path";
}

/**
 * The terminal panel is the draft's opposite: it has no query and takes no keys.
 *
 * Every other panel is a list the reader narrows by typing, so a keystroke is a
 * character of a query and Escape is the way out. The terminal's reader is a shell
 * on the other end of a pty: the same keystroke is a command, and Escape is what
 * an editor is left with. So the panel keeps its keys for the shell and gives up
 * only the chord that opened it.
 */
export function isTerminalMode(mode: ComposerMode): boolean {
  return mode.kind === "pick" && mode.target === "terminal";
}

export function panelQuery(mode: ComposerMode): string {
  return mode.kind === "draft" ? "" : mode.query;
}

export function panelIndex(mode: ComposerMode, count: number): number {
  if (mode.kind === "draft" || count === 0) return 0;
  return Math.min(mode.index, count - 1);
}

export function panelTarget(mode: ComposerMode): ComposerTarget | null {
  return mode.kind === "pick" ? mode.target : null;
}

export function windowRows<T>(
  rows: readonly T[],
  index: number,
  maxVisible: number,
): { visible: T[]; start: number; end: number } {
  if (rows.length <= maxVisible)
    return { visible: [...rows], start: 0, end: rows.length };
  const half = Math.floor(maxVisible / 2);
  const start = clamp(index - half, rows.length - maxVisible);
  const end = Math.min(rows.length, start + maxVisible);
  return { visible: rows.slice(start, end), start, end };
}
