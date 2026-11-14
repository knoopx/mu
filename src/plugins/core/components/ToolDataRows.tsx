/**
 * The row primitives every tool result is drawn from: a chip line of what a
 * call resolved, a data row, a summary line, a state line, a section head and
 * the running block. One plugin paints a finding and another a revision, and
 * the log must not be able to tell them apart — so the shapes are stated once
 * here and a tool's own view only fills them in.
 */

import type { JSX } from "react";
import type { StyleDesc } from "@gpuix/react";
import {
  Badge,
  Icon,
  Skeleton,
  T,
  useAdwaita,
  type AdwaitaTheme,
  type BadgeVariant,
  type IconName,
} from "adwaita-gpuix";

import type { ToolTranscriptItem } from "../lib/agent/transcriptState";
import { firstLine } from "../../../utils/truncate";
import { StateSpinner } from "./StateSpinner";
import { ToolCaptionLine } from "./ToolCaptionLine";
import { ToolStateLine } from "./ToolStateLine";
import { chipGlyphOf } from "../lib/ui/toolChipIcons";
import { mutedText } from "../lib/ui/theme";
import {
  INLINE_GLYPH,
  METER_RULE_HEIGHT,
  METER_RULE_RADIUS,
  METER_TRACK_WIDTH,
  MARKER_GLYPH,
  emphasisWeight,
  lineBox,
  subLineIndent,
} from "../lib/ui/tokens";
import {
  toolBodyColumn,
  toolEllipsis,
  toolGapColumn,
  toolLine,
  toolMark,
  toolMonoOneLine,
  toolOneLine,
  toolText,
} from "../lib/ui/toolRows";
import {
  figureColumnsOf,
  meterFill,
  toolBadgeVariant,
  toolBodyStack,
  toolChip,
  toolChipLine,
  toolDataRow,
  toolFigureRow,
  toolFigureSlot,
  toolIdText,
  toolKeyColumn,
  toolStatusIcon,
  toolStatusTone,
  toolToneColor,
  type ToolPaintRow,
  type ToolPaintSection,
  type ToolRowCell,
  type ToolRowFigureColumns,
  type ToolRowMeter,
  type ToolRowTone,
} from "../lib/ui/toolRowPaint";

/**
 * The chips a call resolved, riding the right end of its header's single line:
 * what it was pointed at and what it resolved there.
 *
 * They belong to the header because they are the call rather than its answer, and a
 * header is one row tall — so the line never wraps and gives way at its end instead
 * of pushing the tool's own name onto a second row. They stand at the end of the
 * line, against the status mark, because the figures of successive rows are read
 * down a column: a chip line that starts after a title of varying length is a row
 * of numbers that never line up.
 *
 * A chip says its figure with a mark where the vocabulary in `toolChipIcons` has
 * one, and with its word where it does not. The value keeps its text — a mark is a
 * noun, never a number.
 */
export function ToolHeaderChips({
  cells,
}: {
  cells: readonly ToolRowCell[];
}): JSX.Element | null {
  const t = useAdwaita();
  const shown = cells.filter((cell) => cell.value !== "");
  if (shown.length === 0) return null;

  return (
    <div
      style={{
        ...toolChipLine(t),
        flexWrap: "nowrap",
        flexShrink: 1,
        minWidth: 0,
        overflow: "hidden",
      }}
    >
      {shown.map((cell) => {
        const glyph = chipGlyphOf(cell.label);
        return (
          <div key={`${cell.label}/${cell.value}`} style={toolChip(t)}>
            {glyph === null ? (
              <T size="caption" color={mutedText(t)} style={{ flexShrink: 0 }}>
                {cell.label}
              </T>
            ) : (
              <Icon
                name={glyph}
                size={INLINE_GLYPH}
                color={mutedText(t)}
                style={{ flexShrink: 0 }}
              />
            )}
            <T
              size="body"
              color={t.color.text.primary}
              style={{ flexShrink: 0, fontFamily: t.type.fontFamilyMono }}
            >
              {cell.value}
            </T>
          </div>
        );
      })}
    </div>
  );
}

/** How far a row's score fills its track, in the tone of the row. */
function ToolMeterBar({
  meter,
  color,
}: {
  meter: ToolRowMeter;
  color: string;
}): JSX.Element | null {
  const t = useAdwaita();
  const width = meterFill(meter);
  if (width === 0) return null;

  return (
    <div
      style={{
        width: METER_TRACK_WIDTH,
        height: lineBox(t, "micro"),
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          height: METER_RULE_HEIGHT,
          borderRadius: METER_RULE_RADIUS,
          // The track is the column: an invisible one leaves a score reading as
          // a dash of no particular length, floating where nothing anchors it.
          backgroundColor: t.color.divider.default,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width,
            height: METER_RULE_HEIGHT,
            borderRadius: METER_RULE_RADIUS,
            backgroundColor: color,
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
}

/** A trailing figure is a set of numbers and words measured in mono, so its
 *  digits line up down the column the way the id column's do. */
const toolFigureText = (t: AdwaitaTheme): StyleDesc => ({
  fontFamily: t.type.fontFamilyMono,
  flexShrink: 0,
  // The figure stands in a column the list measured, so it is clipped there
  // rather than broken over two lines and lifting the row out of the pitch.
  ...toolEllipsis,
});

/** The body of a row: what it is about, where it is, and the lines under it.
 *  A member line stands under its parent's body, so it clears the id column the
 *  list measured rather than a column of its own choosing. */
function ToolRowBody({
  primary,
  secondary,
  members,
  keyWidth,
  muted = false,
}: {
  primary: string;
  secondary: string;
  members: readonly string[];
  keyWidth: number;
  /** The primary line is a placeholder, and reads at the weight of the line under it. */
  muted?: boolean;
}): JSX.Element {
  const t = useAdwaita();
  // Two lines of text per row and never more: each line is one line of text with
  // a marked cut, so no row of the table stands taller than its neighbours and
  // the figures stay level down the list.
  const lines = (
    <>
      <T
        size="list"
        color={primary === "" || muted ? mutedText(t) : t.color.text.primary}
        style={toolOneLine}
      >
        {primary === "" ? "—" : primary}
      </T>
      {secondary === "" ? null : (
        <T size="caption" color={mutedText(t)} style={toolMonoOneLine(t)}>
          {secondary}
        </T>
      )}
    </>
  );

  if (members.length === 0) return <div style={toolBodyColumn}>{lines}</div>;

  return (
    <div style={toolBodyColumn}>
      <div style={toolBodyColumn}>{lines}</div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          paddingLeft: subLineIndent(t, keyWidth),
          flexGrow: 1,
          flexBasis: 0,
          minWidth: 0,
          pointerEvents: "none",
        }}
      >
        {members.map((member) => (
          <T
            key={member}
            size="caption"
            color={mutedText(t)}
            style={toolMonoOneLine(t)}
          >
            {`↳ ${member}`}
          </T>
        ))}
      </div>
    </div>
  );
}

/**
 * The figures a row trails, standing in the columns its list reserved: a score
 * meter, a trailing count, a state badge. A row stands a slot in every column
 * the list has, empty when it has nothing for it, so the meter of the row under
 * a `high` is not shoved half a badge to the left of it by a `widespread`.
 */
function ToolRowFigures({
  row,
  columns,
  variants,
}: {
  row: ToolPaintRow;
  columns: ToolRowFigureColumns;
  variants: Readonly<Record<string, BadgeVariant>>;
}): JSX.Element | null {
  const t = useAdwaita();
  if (columns.meter === 0 && columns.trailing === 0 && columns.badge === 0) {
    return null;
  }
  const badge = row.badge.trim();
  const trailing = row.trailing ?? "";
  const meter = row.meter;

  return (
    <div style={toolFigureRow(t)}>
      {columns.meter === 0 ? null : (
        <div style={toolFigureSlot(columns.meter, "start")}>
          {meter === null || meter === undefined ? null : (
            <ToolMeterBar
              meter={meter}
              color={toolToneColor(t, row.tone ?? "neutral")}
            />
          )}
        </div>
      )}
      {columns.trailing === 0 ? null : (
        <div style={toolFigureSlot(columns.trailing, "end")}>
          {trailing === "" ? null : (
            <T size="micro" color={mutedText(t)} style={toolFigureText(t)}>
              {trailing}
            </T>
          )}
        </div>
      )}
      {columns.badge === 0 ? null : (
        <div style={toolFigureSlot(columns.badge, "end")}>
          {badge === "" ? null : (
            <Badge size="sm" variant={toolBadgeVariant(badge, variants)}>
              {badge}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * One data row: the id in a mono key column, the thing the row is about, a
 * muted secondary line, the member lines under it, how far its score fills a
 * meter, and a Badge when it carries a state. The badge variants and whether
 * the row lights up under a press are the caller's, because only the caller
 * knows what its rows mean.
 */
function ToolDataRow({
  row,
  first,
  columns,
  variants = {},
  pressable = true,
}: {
  row: ToolPaintRow;
  first: boolean;
  columns: ToolRowFigureColumns;
  variants?: Readonly<Record<string, BadgeVariant>>;
  pressable?: boolean;
}): JSX.Element {
  const t = useAdwaita();
  const members = row.members ?? [];

  return (
    <div
      style={{
        ...toolDataRow(t, first, pressable),
        alignItems: members.length === 0 ? "center" : "flex-start",
      }}
    >
      {columns.id === 0 ? null : (
        <T
          size="caption"
          color={mutedText(t)}
          style={toolKeyColumn(t, columns.id)}
        >
          {toolIdText(row.id ?? "")}
        </T>
      )}
      <ToolRowBody
        primary={row.primary}
        secondary={row.secondary}
        members={members}
        keyWidth={columns.id}
        muted={row.primaryMuted === true}
      />
      <ToolRowFigures row={row} columns={columns} variants={variants} />
    </div>
  );
}

/**
 * A call whose details have no view for this tool: the log shows the first
 * line of the text the tool answered with, and says outright when the call
 * itself errored.
 */
export function ToolUnknownResult({
  item,
  tool,
}: {
  item: ToolTranscriptItem;
  tool: string;
}): JSX.Element {
  const t = useAdwaita();
  const line = firstLine(item.output);
  const note =
    item.status === "error" ? (
      <ToolStateNote
        icon="cancel"
        tone="bad"
        text={line === "" ? `${tool} failed` : line}
      />
    ) : (
      <ToolStateNote icon="info" text={line} />
    );
  /** A mark hangs into the inset from the log's body column, so a lone note
   *  still has to sit in that column to land in the header's mark gutter. */
  return <div style={toolBodyStack(t)}>{note}</div>;
}

/** The count line above a table of rows — how much the call read. */
export function ToolSummary({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: ToolRowTone;
}): JSX.Element | null {
  const t = useAdwaita();
  if (text === "") return null;
  return (
    <ToolCaptionLine
      color={toolToneColor(t, tone)}
      text={text}
      weight={emphasisWeight(t)}
    />
  );
}

/** A state the log has to say in words — a failure, a scope with nothing in it. */
export function ToolStateNote({
  icon,
  text,
  tone = "neutral",
}: {
  icon: IconName;
  text: string;
  tone?: ToolRowTone;
}): JSX.Element | null {
  const t = useAdwaita();
  if (text === "") return null;
  return (
    <ToolStateLine icon={icon} color={toolToneColor(t, tone)} text={text} />
  );
}

/** The name of a group of rows inside one tool's answer. */
function ToolSectionHead({ text }: { text: string }): JSX.Element | null {
  const t = useAdwaita();
  if (text === "") return null;
  return (
    <div style={{ ...toolLine(t), paddingTop: t.space.sm }}>
      <T
        size="caption"
        color={mutedText(t)}
        weight={emphasisWeight(t)}
        style={toolText(t)}
      >
        {text}
      </T>
    </div>
  );
}

/**
 * A call's rows in the order its view put them: one row each, divided, the
 * first undivided. The badge variants are the plugin's because only it knows
 * what its rows' states are called.
 */
export function ToolRowList({
  rows,
  variants = {},
  pressable = true,
  columns,
}: {
  rows: readonly ToolPaintRow[];
  variants?: Readonly<Record<string, BadgeVariant>>;
  pressable?: boolean;
  /** The figure columns, when a wider block than this list already decided them. */
  columns?: ToolRowFigureColumns;
}): JSX.Element[] {
  const t = useAdwaita();
  const cols = columns ?? figureColumnsOf(rows, t);
  return rows.map((row, index) => (
    <ToolDataRow
      key={`${row.key}-${String(index)}`}
      row={row}
      first={index === 0}
      columns={cols}
      variants={variants}
      pressable={pressable}
    />
  ));
}

/** Every section of a call's answer: a head when it has a title, then its rows. */
export function ToolSections({
  sections,
  variants = {},
  pressable = false,
}: {
  sections: readonly ToolPaintSection[];
  variants?: Readonly<Record<string, BadgeVariant>>;
  pressable?: boolean;
}): JSX.Element[] {
  const t = useAdwaita();
  // Every section of one answer stands in the same figure columns, or a head
  // divides the table into columns that only agree with themselves.
  const columns = figureColumnsOf(
    sections.flatMap((section) => [...section.rows]),
    t,
  );
  return sections.map((section, index) => (
    <div
      key={`${section.title || "rows"}-${String(index)}`}
      style={toolBodyStack(t)}
    >
      <ToolSectionHead text={section.title} />
      <ToolRowList
        rows={section.rows}
        variants={variants}
        pressable={pressable}
        columns={columns}
      />
    </div>
  ));
}

/**
 * The note of a view, in the tone and icon its status states. A plugin names
 * its own extra states in `tones`/`icons`; everything else reads from the
 * shared status vocabulary, so a failure looks like a failure in every tool.
 */
export function ToolStatusNote({
  status,
  note,
  tones = {},
  icons = {},
}: {
  status: string;
  note: string;
  tones?: Readonly<Record<string, ToolRowTone>>;
  icons?: Readonly<Record<string, IconName>>;
}): JSX.Element | null {
  return (
    <ToolStateNote
      icon={toolStatusIcon(status, icons)}
      tone={toolStatusTone(status, tones)}
      text={note}
    />
  );
}

/** How much a call left out, and what the reader does about it — one line, whatever tool it was. */
export function ToolTruncated({
  count,
  text,
}: {
  count: number;
  text: string;
}): JSX.Element | null {
  if (count <= 0) return null;
  return <ToolStateNote icon="unfoldMore" tone="neutral" text={text} />;
}

/**
 * The bars a running call shows before its rows arrive, in characters of the
 * marker glyph: three chips of an identity line, then an id and a body per row.
 */
const SKELETON_CHIP_GLYPHS = [6, 8, 6] as const;
const SKELETON_KEY_GLYPHS = 6;
const SKELETON_BODY_GLYPHS = 18;

/** The running block: a spinner with what is being read, then skeleton rows. */
export function ToolRunning({
  text,
  rows = 3,
}: {
  text: string;
  rows?: number;
}): JSX.Element {
  const t: AdwaitaTheme = useAdwaita();
  return (
    <div style={toolGapColumn(t)}>
      <div style={{ ...toolLine(t), paddingTop: t.space.xs }}>
        <StateSpinner style={toolMark} />
        <T size="caption" color={mutedText(t)} style={toolText(t)}>
          {text}
        </T>
      </div>
      <div style={{ ...toolLine(t), gap: t.space.xs, flexWrap: "wrap" }}>
        {SKELETON_CHIP_GLYPHS.map((chars, i) => (
          <Skeleton
            key={i}
            width={MARKER_GLYPH * chars}
            height={t.type.micro}
          />
        ))}
      </div>
      {[...Array(rows).keys()].map((i) => (
        <div key={i} style={{ ...toolLine(t), pointerEvents: "none" }}>
          <Skeleton
            width={MARKER_GLYPH * SKELETON_KEY_GLYPHS}
            height={t.type.caption}
          />
          <Skeleton
            width={MARKER_GLYPH * SKELETON_BODY_GLYPHS}
            height={t.type.caption}
          />
        </div>
      ))}
    </div>
  );
}
