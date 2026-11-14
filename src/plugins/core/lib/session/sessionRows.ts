/**
 * The session panel's rows.
 *
 * A session row is a label and two figures — how long the conversation ran and how
 * long ago it was — and the figures stand in columns the whole list measures, so a
 * list of them reads as a table. The status line says what the query left, and says
 * so through the same cap the list is cut at.
 */

import type { AdwaitaTheme, IconName } from "adwaita-gpuix";
import type { ComposerPanelRow, ComposerRowFigure } from "../../components/composer/Composer";
import { composerFigureColumnWidth } from "../../components/composer/rows";
import { matchesQuery } from "../composer/options";
import { cappedPanelStatusText } from "../composer/options";
import { SESSION_ROWS_CAP, type SessionListRow } from "./sessionList";

const SESSION_FIGURES: readonly { icon: IconName; pick: (row: SessionListRow) => string }[] =
  [
    { icon: "schedule", pick: (row) => row.duration },
    { icon: "history", pick: (row) => row.age },
  ];

const figureWidths = (
  t: AdwaitaTheme,
  rows: readonly SessionListRow[],
): number[] =>
  SESSION_FIGURES.map((figure) =>
    composerFigureColumnWidth(
      t,
      rows.reduce((max, row) => Math.max(max, figure.pick(row).length), 0),
    ),
  );

const figuresOf = (
  row: SessionListRow,
  widths: readonly number[],
): ComposerRowFigure[] =>
  SESSION_FIGURES.map((figure, off) => ({
    icon: figure.icon,
    text: figure.pick(row),
    width: widths[off],
  }));

export function sessionRows(
  t: AdwaitaTheme,
  sessions: readonly SessionListRow[],
  query: string,
): ComposerPanelRow[] {
  const widths = figureWidths(t, sessions);
  return sessions
    .filter((s) => matchesQuery(query, s.label, s.age))
    .map((s) => ({
      kind: "option" as const,
      key: s.path,
      label: s.label,
      figures: figuresOf(s, widths),
    }));
}

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
