import type { AdwaitaTheme, IconName } from "adwaita-gpuix";
import type { SlashCommand } from "../../../../autocomplete";
import { ChangesPanel } from "../../../vcs/components/ChangesPanel";
import { FILES_HINTS, STACK_HINTS } from "../../../vcs/lib/shortcuts";
import type { ChangesPanelState } from "../../../vcs/hooks/useChangesPanel";
import { SessionTreePanel } from "../SessionTreePanel";
import { TREE_HINTS } from "../../lib/session/shortcuts";
import type { SessionTreeApi } from "../../hooks/useSessionTree";
import type { ChatSession } from "../../lib/session/chatSession";
import type { SessionListRow } from "../../lib/session/sessionList";
import type { ThemePanelState } from "../../hooks/useThemePanel";
import {
  type ComposerPanelRow,
  type ComposerPanelSpec,
  type ComposerPanelStatusSpec,
  type ComposerPreviewSpec,
  type ComposerRowFigure,
} from "./Composer";
import { composerFieldExtraHeight } from "../../lib/composer/fieldRows";
import { composerFigureColumnWidth, composerPanelRowHeight } from "./rows";
import {
  composerPanelFitHeight,
  composerPanelFitRows,
  composerPanelHeight,
  composerPanelRowsForHeight as panelRowsFor,
  panelChromeHeight,
  PANEL_FIT_MIN_ROWS,
  type PanelSlots,
} from "../../lib/composer/panelHeight";
import {
  panelHints,
  pathCompletionHints,
  sessionPanelHints,
  userMessageHistoryHints,
} from "../../lib/composer/shortcuts";
import {
  panelIndex,
  windowRows,
  type ComposerMode,
  type ComposerTarget,
} from "../../lib/composer/mode";
import {
  cappedPanelStatusText,
  commandRows,
  fileRows,
  matchesQuery,
  panelPlaceholder,
  panelStatusText,
} from "../../lib/composer/options";
import {
  userMessageHistoryRows,
  userMessageHistoryStatusText,
  type UserMessage,
} from "../../lib/composer/userMessageHistory";
import {
  completionPathOf,
  directorySummary,
  pathCompletionRows,
  pathStatusText,
} from "../../lib/composer/pathCompletion";
import { SESSION_ROWS_CAP } from "../../lib/session/sessionList";
import type { GuardrailsPanelApi } from "../../../guardrails/types";
import { ROW_HEIGHT } from "../../lib/ui/tokens";

export function sessionStatusText(
  total: number,
  query: string,
  visible: number,
): string {
  return cappedPanelStatusText(
    "session",
    total,
    visible,
    query,
    SESSION_ROWS_CAP,
    "in this folder",
  );
}

interface SessionFigure {
  icon: IconName;
  pick: (row: SessionListRow) => string;
}

const SESSION_FIGURES: readonly SessionFigure[] = [
  { icon: "schedule", pick: (row) => row.duration },
  { icon: "history", pick: (row) => row.age },
];

const sessionFigureWidths = (
  t: AdwaitaTheme,
  rows: readonly SessionListRow[],
): number[] =>
  SESSION_FIGURES.map((figure) =>
    composerFigureColumnWidth(
      t,
      rows.reduce((max, row) => Math.max(max, figure.pick(row).length), 0),
    ),
  );

const sessionFigures = (
  row: SessionListRow,
  widths: readonly number[],
): ComposerRowFigure[] =>
  SESSION_FIGURES.map((figure, off) => ({
    icon: figure.icon,
    text: figure.pick(row),
    width: widths[off],
  }));

export interface ComposerPanelData {
  cwd: string;
  theme: AdwaitaTheme;
  mode: ComposerMode;
  query: string;
  commands: readonly SlashCommand[];
  session: ChatSession | null;
  themePanel: ThemePanelState;
  sessionRows: readonly SessionListRow[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  userMessages: readonly UserMessage[];
  userMessagesLoading: boolean;
  userMessagesError: string | null;
  changes: ChangesPanelState;
  tree: SessionTreeApi;
  guardrails: GuardrailsPanelApi;
  previewFor(path: string): ComposerPreviewSpec;
  windowHeight: number | undefined;
  onPick: (row: ComposerPanelRow) => void;
  onDelete: (row: ComposerPanelRow) => void;
  onHover: (mode: ComposerMode, index: number, count: number) => void;
}

export function composerPanelRows(data: ComposerPanelData): ComposerPanelRow[] {
  const { mode, query, cwd, themePanel } = data;
  if (mode.kind === "commands") return commandRows(data.commands, query);
  const target = mode.kind === "pick" ? mode.target : null;
  switch (target) {
    case "session": {
      const widths = sessionFigureWidths(data.theme, data.sessionRows);
      return data.sessionRows
        .filter((s) => matchesQuery(query, s.label, s.age))
        .map((s) => ({
          kind: "option" as const,
          key: s.path,
          label: s.label,
          figures: sessionFigures(s, widths),
        }));
    }
    case "userMessageHistory":
      return userMessageHistoryRows(data.userMessages, query);
    case "theme":
    case "accent":
      return themePanel.rows;
    case "file":
      return fileRows(cwd, query);
    case "path":
      return pathCompletionRows(query, cwd);
    case "model":
      return data.session?.modelRows(query) ?? [];
    case "thinking":
      return data.session?.thinkingRows(query) ?? [];
    case "guardrails":
      return [...data.guardrails.rows];
    default:
      return [];
  }
}

type ListSource = ComposerTarget | "commands";

const TALL_SOURCES: ListSource[] = ["session", "userMessageHistory", "path"];

const BUSY_TEXT: Partial<Record<ListSource, string>> = {
  session: "Reading sessions…",
  userMessageHistory: "Reading user messages of all sessions…",
};

const EMPTY_TEXT: Partial<Record<ListSource, string>> = {
  session: "No sessions for this folder",
  userMessageHistory: "No user messages in this folder’s sessions",
  path: "No path matches",
};

function listSourceOf(mode: ComposerMode): ListSource {
  if (mode.kind === "pick") return mode.target;
  return "commands";
}

const listBusy = (
  data: ComposerPanelData,
  source: ListSource,
  rowsEmpty: boolean,
): boolean => {
  if (source === "userMessageHistory")
    return data.userMessagesLoading && rowsEmpty;
  if (source === "session") return data.sessionsLoading;
  return false;
};

const listError = (
  data: ComposerPanelData,
  source: ListSource,
): string | undefined => {
  if (source === "userMessageHistory")
    return data.userMessagesError ?? undefined;
  if (source === "session") return data.sessionsError ?? undefined;
  return undefined;
};

const listTotal = (
  data: ComposerPanelData,
  source: ListSource,
): number | undefined => {
  switch (source) {
    case "commands":
      return data.commands.length;
    case "model":
      return data.session?.modelCount();
    case "thinking":
      return data.session?.thinkingCount();
    case "theme":
    case "accent":
      return data.themePanel.total;
    default:
      return undefined;
  }
};

function listStatus(
  data: ComposerPanelData,
  source: ListSource,
  rows: readonly ComposerPanelRow[],
  query: string,
  total: number | undefined,
): ComposerPanelStatusSpec {
  if (source === "session")
    return {
      message: sessionStatusText(data.sessionRows.length, query, rows.length),
      hints: sessionPanelHints(),
    };
  if (source === "userMessageHistory")
    return {
      message: userMessageHistoryStatusText(
        data.userMessages.length,
        query,
        rows.length,
      ),
      hints: userMessageHistoryHints(),
    };
  if (source === "guardrails")
    return {
      message: data.guardrails.statusText,
      hints: panelHints("guardrails"),
    };
  if (source === "path")
    return {
      message: pathStatusText(query, rows.length),
      hints: pathCompletionHints(),
    };
  return {
    message:
      rows.length === 0
        ? undefined
        : panelStatusText(source, rows.length, total, query),
    hints: panelHints(source),
  };
}

const previewOf = (
  data: ComposerPanelData,
  mode: ComposerMode,
  rows: readonly ComposerPanelRow[],
): ComposerPreviewSpec | undefined => {
  if (mode.kind !== "pick") return undefined;
  if (mode.target !== "file" && mode.target !== "path") return undefined;
  const active = rows[panelIndex(mode, rows.length)];
  if (active === undefined || active.kind !== "option") return undefined;
  if (mode.target !== "path") return data.previewFor(active.key);

  const spec = data.previewFor(completionPathOf(active.key, data.cwd));
  const note = directorySummary(active.key, data.cwd);
  return note === undefined ? spec : { ...spec, note };
};

function changesStatus(changes: ChangesPanelState): ComposerPanelStatusSpec {
  const change = changes.rows[changes.sel];
  const files = `${changes.files.length} files`;
  const selected =
    changes.checked.size > 0 ? ` · ${changes.checked.size} selected` : "";
  const at =
    change === undefined
      ? ""
      : ` · ${change.change_id.slice(0, 8)} · ${change.author}`;
  return {
    message:
      `${changes.rows.length} changes in ${changes.currentRevset}${at}` +
      ` · ${files}${selected}`,
    hints: changes.focus === "stack" ? STACK_HINTS : FILES_HINTS,
  };
}

const treeStatus = (tree: SessionTreeApi): ComposerPanelStatusSpec => ({
  message: `${tree.rows.length} of ${tree.total} points · ${tree.filterLabel}`,
  hints: TREE_HINTS,
});

/** A wide panel draws its list and its status line, and no draft above them. */
const WIDE_SLOTS: PanelSlots = { field: false, statusBar: true };

function wideHeight(data: ComposerPanelData, isChanges: boolean): number {
  const { theme: t, tree, windowHeight } = data;
  if (isChanges) return composerPanelHeight(windowHeight);
  return composerPanelFitHeight(
    t,
    windowHeight,
    Math.max(PANEL_FIT_MIN_ROWS, tree.rows.length) * ROW_HEIGHT,
    WIDE_SLOTS,
  );
}

function widePanelSpec(
  data: ComposerPanelData,
  isChanges: boolean,
): ComposerPanelSpec {
  const { theme: t, changes, tree, windowHeight } = data;
  const height = wideHeight(data, isChanges);
  return {
    status: isChanges ? changesStatus(changes) : treeStatus(tree),
    rows: [],
    height,
    maxVisible: panelRowsFor(t, composerPanelHeight(windowHeight), WIDE_SLOTS),
    wide: {
      node: isChanges ? (
        <ChangesPanel panel={changes} />
      ) : (
        <SessionTreePanel
          model={tree}
          sel={tree.sel}
          listRef={tree.listRef}
          onSelect={tree.select}
        />
      ),
      onKey: isChanges ? changes.onKey : tree.onKey,
      height,
    },
    onPick: () => {},
    onHover: () => {},
  };
}

function listPanelSpec(
  data: ComposerPanelData,
  rows: ComposerPanelRow[],
): ComposerPanelSpec {
  const { theme: t, mode, query, windowHeight } = data;
  const source = listSourceOf(mode);
  const tallList = TALL_SOURCES.includes(source);
  const panelBand = composerPanelHeight(windowHeight);
  const preview = previewOf(data, mode, rows);
  const busy = listBusy(data, source, rows.length === 0);
  const error = listError(data, source);
  const total = listTotal(data, source);

  const rowsHeightOf = (list: readonly ComposerPanelRow[]): number =>
    list.reduce((sum, row) => sum + composerPanelRowHeight(t, row), 0);

  const slots: PanelSlots = {
    statusBar: true,
    fieldExtra: tallList ? composerFieldExtraHeight(t, query) : 0,
  };
  const statusLine =
    busy || error !== undefined || rows.length === 0 ? ROW_HEIGHT : 0;
  const listHeight = rowsHeightOf(rows) + statusLine;
  const maxVisible = composerPanelFitRows(
    t,
    rows,
    panelBand - panelChromeHeight(t, slots),
  );
  const windowedHeight =
    rowsHeightOf(
      windowRows(rows, panelIndex(mode, rows.length), maxVisible).visible,
    ) + statusLine;

  return {
    placeholder: panelPlaceholder(source),
    rows,
    ...(preview === undefined ? {} : { preview }),
    height: composerPanelFitHeight(
      t,
      windowHeight,
      tallList ? windowedHeight : listHeight,
      slots,
    ),
    maxVisible,
    busy,
    ...(BUSY_TEXT[source] !== undefined ? { busyText: BUSY_TEXT[source] } : {}),
    error,
    status: listStatus(data, source, rows, query, total),
    ...(source === "session" ? { onDelete: data.onDelete } : {}),
    
    
    emptyText:
      source === "guardrails"
        ? data.guardrails.emptyText
        : (EMPTY_TEXT[source] ?? "No matches"),
    onPick: data.onPick,
    onHover: (index: number) => data.onHover(mode, index, rows.length),
  };
}

export function composerPanelSpec(
  data: ComposerPanelData,
  rows: ComposerPanelRow[],
): ComposerPanelSpec | undefined {
  const target = data.mode.kind === "pick" ? data.mode.target : null;
  if (target === "changes") return widePanelSpec(data, true);
  if (target === "tree") return widePanelSpec(data, false);
  if (data.mode.kind === "draft") return undefined;
  return listPanelSpec(data, rows);
}
