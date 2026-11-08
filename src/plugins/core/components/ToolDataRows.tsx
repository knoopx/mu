/**
 * The row primitives every tool result is drawn from: a chip line of what a
 * call resolved, a data row, a summary line, a state line, a section head and
 * the running block. One plugin paints a finding and another a revision, and
 * the log must not be able to tell them apart — so the shapes are stated once
 * here and a tool's own view only fills them in.
 */

import type { JSX } from "react";
import {
  Badge,
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
import { mutedText } from "../lib/ui/theme";
import {
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
  toolGapColumn,
  toolGrow,
  toolLine,
  toolMark,
  toolText,
} from "../lib/ui/toolRows";
import {
  meterFill,
  toolBadgeVariant,
  toolBodyStack,
  toolChip,
  toolChipLine,
  toolDataRow,
  toolIdText,
  toolKeyColumn,
  toolMonoGrow,
  toolStatusIcon,
  toolStatusTone,
  toolToneColor,
  type ToolPaintRow,
  type ToolPaintSection,
  type ToolRowCell,
  type ToolRowMeter,
  type ToolRowTone,
} from "../lib/ui/toolRowPaint";

/** The chips a call resolved: what it was pointed at and what it resolved there. */
export function ToolChips({
  cells,
}: {
  cells: readonly ToolRowCell[];
}): JSX.Element | null {
  const t = useAdwaita();
  const shown = cells.filter((cell) => cell.value !== "");
  if (shown.length === 0) return null;

  return (
    <div style={toolChipLine(t)}>
      {shown.map((cell) => (
        <div key={`${cell.label}/${cell.value}`} style={toolChip(t)}>
          <T size="micro" color={mutedText(t)} style={{ flexShrink: 0 }}>
            {cell.label}
          </T>
          <T
            size="caption"
            color={t.color.text.primary}
            style={{ flexShrink: 0, fontFamily: t.type.fontFamilyMono }}
          >
            {cell.value}
          </T>
        </div>
      ))}
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
          backgroundColor: t.color.divider.faint,
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

/** The body of a row: what it is about, where it is, and the lines under it. */
function ToolRowBody({
  primary,
  secondary,
  members,
}: {
  primary: string;
  secondary: string;
  members: readonly string[];
}): JSX.Element {
  const t = useAdwaita();
  const lines = (
    <>
      <T
        size="list"
        color={primary === "" ? mutedText(t) : t.color.text.primary}
        style={toolGrow}
      >
        {primary === "" ? "—" : primary}
      </T>
      {secondary === "" ? null : (
        <T size="caption" color={mutedText(t)} style={toolMonoGrow(t)}>
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
          paddingLeft: subLineIndent(t),
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
            style={toolMonoGrow(t)}
          >
            {`↳ ${member}`}
          </T>
        ))}
      </div>
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
  variants = {},
  pressable = true,
}: {
  row: ToolPaintRow;
  first: boolean;
  variants?: Readonly<Record<string, BadgeVariant>>;
  pressable?: boolean;
}): JSX.Element {
  const t = useAdwaita();
  const tone = row.tone ?? "neutral";
  const members = row.members ?? [];
  const badge = row.badge.trim();
  const meter = row.meter;

  return (
    <div
      style={{
        ...toolDataRow(t, first, pressable),
        alignItems: members.length === 0 ? "center" : "flex-start",
      }}
    >
      <T size="caption" color={mutedText(t)} style={toolKeyColumn(t)}>
        {toolIdText(row.key)}
      </T>
      <ToolRowBody
        primary={row.primary}
        secondary={row.secondary}
        members={members}
      />
      {meter === null || meter === undefined ? null : (
        <ToolMeterBar meter={meter} color={toolToneColor(t, tone)} />
      )}
      {row.trailing === undefined || row.trailing === "" ? null : (
        <T size="micro" color={mutedText(t)} style={{ flexShrink: 0 }}>
          {row.trailing}
        </T>
      )}
      {badge === "" ? null : (
        <Badge
          size="sm"
          variant={toolBadgeVariant(badge, variants)}
          style={{ flexShrink: 0 }}
        >
          {badge}
        </Badge>
      )}
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
}: {
  rows: readonly ToolPaintRow[];
  variants?: Readonly<Record<string, BadgeVariant>>;
  pressable?: boolean;
}): JSX.Element[] {
  return rows.map((row, index) => (
    <ToolDataRow
      key={`${row.key}-${String(index)}`}
      row={row}
      first={index === 0}
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
