/**
 * Draws a table call in the transcript: the table itself, what its columns add
 * up to, and — when a row did not fit its header — the cells that did not.
 *
 * The chips, the notes, the truncation and the running block are core's. This
 * file owns the words a table answer has that no other answer has, and the rows.
 * A column of figures is set in mono and stands on the right of its column — the
 * same reading a program's `Table` gives — because a column of numbers is read
 * down, and digits that do not line up under the header cannot be.
 */

import type { JSX } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type BadgeVariant,
  type IconName,
  useAdwaita,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import {
  ToolChips,
  ToolRowList,
  ToolRunning,
  ToolStatusNote,
  ToolSummary,
  ToolTruncated,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import {
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import {
  toolBodyStack,
  toolStatusTone,
  type ToolPaintRow,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import { mutedText } from "../../core/lib/ui/theme";
import { TABLE_RENDER_TOOL } from "../constants";
import { tableFailureLine, tableToolViewOf, type TableToolView } from "../lib/toolView";

const RUNNING_TEXT: Record<string, string> = {
  [TABLE_RENDER_TOOL]: "drawing the table",
};

const EMPTY_TEXT: Record<string, string> = {
  [TABLE_RENDER_TOOL]: "no rows to draw",
};

/** A table answer's own words, so the header never has to guess. */
const TABLE_WORDS: ToolPreviewVocabulary = {
  running: RUNNING_TEXT,
  runningDefault: "drawing the table",
  clean: ["empty"],
  empty: EMPTY_TEXT,
  emptyDefault: "no rows to draw",
  stated: {},
};

const TABLE_STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  invalid: "bad",
  empty: "warn",
};

const TABLE_STATUS_ICONS: Readonly<Record<string, IconName>> = {
  invalid: "error",
  empty: "info",
};

const TABLE_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  overflow: "destructive",
  unreadable: "destructive",
};

/** How many column names the header shows before it says how many more there are. */
const HEAD_COLUMNS = 4;

export function isTableTool(name: string): boolean {
  return name.toLowerCase() === TABLE_RENDER_TOOL;
}

/** The tool header: the header row itself, which is what a reader scans first. */
export const tableToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    tableToolViewOf(item.name, item.args, item.details, item.status),
    TABLE_WORDS,
    headOf,
  );

function headOf(_tool: string, view: TableToolView): string {
  const { table } = view;
  if (table.status === "invalid") return tableFailureLine(table);

  const named = table.columns.slice(0, HEAD_COLUMNS).join(" · ");
  const rest = table.columns.length - HEAD_COLUMNS;
  return rest > 0 ? `${named} +${String(rest)}` : named;
}

/** The cells a refusal could not place: which row, which column, and what was in it. */
function badRows(view: TableToolView): ToolPaintRow[] {
  return view.table.bad.map((bad, index) => ({
    key: `r-${String(bad.at)}-${String(index)}`,
    primary: `row ${String(bad.at + 1)} · ${bad.column}`,
    secondary: bad.reason === "unreadable"
      ? `${bad.value === "" ? "(nothing)" : bad.value} is not text`
      : `${bad.value === "" ? "(nothing)" : bad.value} has no column to stand in`,
    badge: bad.reason,
    tone: "bad" as ToolRowTone,
  }));
}

export interface TableToolRowsProps {
  item: ToolTranscriptItem;
}

export function TableToolRows({ item }: TableToolRowsProps): JSX.Element {
  const t = useAdwaita();

  if (item.status === "running") {
    return (
      <ToolRunning text={RUNNING_TEXT[item.name.toLowerCase()] ?? RUNNING_TEXT[TABLE_RENDER_TOOL]} />
    );
  }

  const view = tableToolViewOf(item.name, item.args, item.details, item.status);
  if (view === null) return <ToolUnknownResult item={item} tool={item.name} />;

  const { table } = view;
  const tone = toolStatusTone(view.status, TABLE_STATUS_TONES);

  /** A column of figures is set in mono and right-aligned, header included. */
  const figureColumn = (at: number): boolean => table.stats[at]?.figure === true;
  const figureStyle = (at: number): StyleDesc | undefined =>
    figureColumn(at)
      ? { fontFamily: t.type.fontFamilyMono, whiteSpace: "nowrap" }
      : undefined;
  const alignOf = (at: number) => (figureColumn(at) ? "right" : undefined);

  return (
    <div style={toolBodyStack(t)}>
      <ToolChips cells={view.cells} />

      {table.status === "ok" ? (
        <Table density="dense" style={{ width: "100%", minWidth: 0 }}>
          <TableHeader>
            {table.columns.map((column, at) => (
              <TableHead key={`h-${column}-${String(at)}`} align={alignOf(at)}>
                {column}
              </TableHead>
            ))}
          </TableHeader>
          <TableBody>
            {table.rows.map((cells, row) => (
              <TableRow key={`r-${String(row)}`}>
                {table.columns.map((column, at) => (
                  <TableCell
                    key={`c-${String(row)}-${column}-${String(at)}`}
                    align={alignOf(at)}
                    style={figureStyle(at)}
                  >
                    {cells[at] ?? ""}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : null}

      {table.caption === "" ? null : (
        <ToolCaptionLine color={mutedText(t)} text={table.caption} />
      )}

      <ToolTruncated
        count={table.omitted}
        text={`… ${String(table.omitted)} more ${table.omitted === 1 ? "row" : "rows"} not drawn — group them or send the ones that matter`}
      />

      {table.status === "invalid" ? (
        <>
          <ToolSummary text={tableFailureLine(table)} tone={tone} />
          <ToolRowList
            rows={badRows(view)}
            variants={TABLE_BADGE_VARIANTS}
            pressable={false}
          />
        </>
      ) : null}

      <ToolStatusNote
        status={view.status}
        note={table.status === "ok" ? "" : table.error}
        tones={TABLE_STATUS_TONES}
        icons={TABLE_STATUS_ICONS}
      />
    </div>
  );
}
