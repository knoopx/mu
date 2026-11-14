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

import type { ComposerPanelRow, ComposerPanelSpec } from "./Composer";
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
    view = panelViewOf(HOST, data.mode.target, data);
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

/** A panel of rows, measured and framed by core. */
function listPanelSpec(
  data: ComposerPanelData,
  view: PanelView,
  rows: ComposerPanelRow[],
): ComposerPanelSpec {
  const { theme: t, mode, query, windowHeight } = data;
  const source = listSourceOf(mode);
  const panelBand = composerPanelHeight(windowHeight);
  const busy = view.busy === true;
  const error = view.error;
  const total = view.total;

  const rowsHeightOf = (list: readonly ComposerPanelRow[]): number =>
    list.reduce((sum, row) => sum + composerPanelRowHeight(t, row), 0);

  const slots: PanelSlots = {
    statusBar: true,
    fieldExtra: view.tall === true ? composerFieldExtraHeight(t, query) : 0,
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
    placeholder: view.placeholder ?? panelPlaceholder(source),
    rows,
    ...(view.preview === undefined ? {} : { preview: view.preview }),
    height: composerPanelFitHeight(
      t,
      windowHeight,
      view.tall === true ? windowedHeight : listHeight,
      slots,
    ),
    maxVisible,
    busy,
    ...(view.busyText === undefined ? {} : { busyText: view.busyText }),
    error,
    status:
      view.status ?? {
        message:
          rows.length === 0
            ? undefined
            : panelStatusText(source, rows.length, total, query),
        hints: panelHints(source),
      },
    ...(panelCanDelete(source) ? { onDelete: data.onDelete } : {}),
    ...(panelCanOpen(source) ? { onOpen: data.onOpen } : {}),
    ...(panelCanEdit(source) ? { onEdit: data.onEdit } : {}),
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
