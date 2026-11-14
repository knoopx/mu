/**
 * The composer's panel chrome.
 *
 * A panel belongs to the plugin that owns it, and the plugin says what it shows by
 * registering a `panel` function (`core/lib/plugin/manifest.ts`): rows for the
 * plain list drawn here, or a component that fills the band, with the status line,
 * the keys, and what the panel says while it reads or when it has nothing to show.
 * What lives here is the chrome those answers are drawn through — the band, the
 * list, the preview pane, the height math — and the command palette, which is the
 * window's own list and opens without a chord. No plugin's name is written in this
 * file, and no target is switched on: a plugin that takes a panel takes it whole.
 */

import type { AdwaitaTheme } from "adwaita-gpuix";
import type {
  ComposerPanelRow,
  ComposerPanelSpec,
  ComposerPanelStatusSpec,
} from "./Composer";
import { composerFieldExtraHeight } from "../../lib/composer/fieldRows";
import {
  composerPanelFitHeight,
  composerPanelFitRows,
  composerPanelHeight,
  composerPanelRowsForHeight as panelRowsFor,
  panelChromeHeight,
  type PanelSlots,
} from "../../lib/composer/panelHeight";
import {
  panelCanDelete,
  panelCanEdit,
  panelCanOpen,
  panelHints,
} from "../../lib/composer/shortcuts";
import {
  commandRows,
  panelPlaceholder,
  panelStatusText,
} from "../../lib/composer/options";
import {
  panelIndex,
  windowRows,
  type ComposerMode,
  type ComposerTarget,
} from "../../lib/composer/mode";
import type { ComposerPanelData } from "../../lib/composer/panelData";
import { HOST } from "../../../registry";
import { panelViewOf } from "../../lib/plugin/surfaces";
import type { PanelView } from "../../lib/plugin/manifest";
import { ROW_HEIGHT } from "../../lib/ui/tokens";
import { composerPanelRowHeight } from "./rows";

/**
 * What the open panel shows, asked once per composer render.
 *
 * The rows are measured for the cursor before the panel is drawn and then read
 * again to lay the band out, on the same data bag. A panel that reads something to
 * get its rows — the file panel walks the project, the tree walks the session —
 * would do it twice a render otherwise, so the answer is kept beside the data it
 * was given.
 */
const asked = new WeakMap<ComposerPanelData, PanelView | null>();

function viewOf(data: ComposerPanelData): PanelView | null {
  if (asked.has(data)) return asked.get(data) ?? null;
  let view: PanelView | null = null;
  if (data.mode.kind === "commands") view = commandsView(data);
  else if (data.mode.kind === "pick")
    view = panelViewOf(
      HOST,
      data.mode.target,
      data.panelState.get(data.mode.target),
      data,
    );
  asked.set(data, view);
  return view;
}

/** The list a panel shows right now, in rows core can measure. */
export function composerPanelRows(data: ComposerPanelData): ComposerPanelRow[] {
  return [...(viewOf(data)?.rows ?? [])];
}

type ListSource = ComposerTarget | "commands";

const listSourceOf = (mode: ComposerMode): ListSource =>
  mode.kind === "pick" ? mode.target : "commands";

/**
 * The command palette: the window's own list, opened from the draft rather than
 * from a panel, so it is the one list whose rows are built here.
 */
const commandsView = (data: ComposerPanelData): PanelView => ({
  rows: commandRows(data.commands, data.query),
  total: data.commands.length,
});

/**
 * How a list of rows sits in the band.
 *
 * The rows are measured once for the list as a whole and once for the window of
 * rows the cursor is standing in — a tall panel lays out only that window — and
 * both measurements carry the same extra line, so the band does not jump when the
 * cursor moves.
 */
interface ListFit {
  listHeight: number;
  windowedHeight: number;
  maxVisible: number;
}

function listFit(
  t: AdwaitaTheme,
  view: PanelView,
  rows: readonly ComposerPanelRow[],
  mode: ComposerMode,
  panelBand: number,
  slots: PanelSlots,
): ListFit {
  const rowsHeightOf = (list: readonly ComposerPanelRow[]): number =>
    list.reduce((sum, row) => sum + composerPanelRowHeight(t, row), 0);
  // One line under the rows, charged only when something stands there: what the
  // panel says while it reads, what it says when it failed, or its empty words.
  const extraLine =
    view.busy === true || view.error !== undefined || rows.length === 0
      ? ROW_HEIGHT
      : 0;
  const maxVisible = composerPanelFitRows(
    t,
    rows,
    panelBand - panelChromeHeight(t, slots),
  );
  return {
    listHeight: rowsHeightOf(rows) + extraLine,
    windowedHeight:
      rowsHeightOf(
        windowRows(rows, panelIndex(mode, rows.length), maxVisible).visible,
      ) + extraLine,
    maxVisible,
  };
}

/** The line a list shows under its rows when its panel does not bring its own:
 *  what the list holds, and the keys its target actually takes. */
const listStatus = (
  source: ListSource,
  view: PanelView,
  rowCount: number,
  query: string,
): ComposerPanelStatusSpec =>
  view.status ?? {
    message:
      rowCount === 0
        ? undefined
        : panelStatusText(source, rowCount, view.total, query),
    hints: panelHints(source),
  };

/** A row handler only lands on the spec when the panel's target takes that key, so
 *  the hint line and the keys a pick can land on cannot drift apart. */
const listHandlers = (source: ListSource, data: ComposerPanelData) => ({
  ...(panelCanDelete(source) ? { onDelete: data.onDelete } : {}),
  ...(panelCanOpen(source) ? { onOpen: data.onOpen } : {}),
  ...(panelCanEdit(source) ? { onEdit: data.onEdit } : {}),
});

/** A panel of rows, measured and framed by core. */
function listPanelSpec(
  data: ComposerPanelData,
  view: PanelView,
  rows: ComposerPanelRow[],
): ComposerPanelSpec {
  const { theme: t, mode, query, windowHeight } = data;
  const source = listSourceOf(mode);
  const slots: PanelSlots = {
    statusBar: true,
    fieldExtra: view.tall === true ? composerFieldExtraHeight(t, query) : 0,
  };
  const fit = listFit(
    t,
    view,
    rows,
    mode,
    composerPanelHeight(windowHeight),
    slots,
  );

  return {
    placeholder: view.placeholder ?? panelPlaceholder(source),
    rows,
    preview: view.preview,
    height: composerPanelFitHeight(
      t,
      windowHeight,
      view.tall === true ? fit.windowedHeight : fit.listHeight,
      slots,
    ),
    maxVisible: fit.maxVisible,
    busy: view.busy === true,
    busyText: view.busyText,
    error: view.error,
    status: listStatus(source, view, rows.length, query),
    ...listHandlers(source, data),
    emptyText: view.emptyText ?? "No matches",
    onPick: data.onPick,
    onHover: (index: number) => data.onHover(mode, index, rows.length),
  };
}

/** The band a panel fills with its own component: no draft field above it. */
const BAND_SLOTS: PanelSlots = { field: false, statusBar: true };

function bandPanelSpec(
  data: ComposerPanelData,
  view: PanelView,
): ComposerPanelSpec {
  const { theme: t, windowHeight } = data;
  const band = composerPanelHeight(windowHeight);
  const height =
    view.rowsForFit === undefined
      ? band
      : composerPanelFitHeight(
          t,
          windowHeight,
          Math.max(1, view.rowsForFit) * ROW_HEIGHT,
          BAND_SLOTS,
        );
  return {
    status: view.status,
    rows: [],
    height,
    maxVisible: panelRowsFor(t, band, BAND_SLOTS),
    wide: {
      node: view.node,
      ...(view.onKey === undefined ? {} : { onKey: view.onKey }),
      height,
    },
    onPick: () => {},
    onHover: () => {},
  };
}

export function composerPanelSpec(
  data: ComposerPanelData,
  rows: ComposerPanelRow[],
): ComposerPanelSpec | undefined {
  if (data.mode.kind === "draft") return undefined;
  const view = viewOf(data);
  // A target no plugin owns shows nothing: an empty band is the honest answer,
  // and the host has already refused a plugin that claims a target twice.
  if (view === null) return undefined;
  if (view.node !== undefined) return bandPanelSpec(data, view);
  return listPanelSpec(data, view, rows);
}
