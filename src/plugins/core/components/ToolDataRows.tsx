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
  Spinner,
  T,
  useAdwaita,
  type AdwaitaTheme,
  type BadgeVariant,
  type IconName,
} from "adwaita-gpuix";

import type { ToolTranscriptItem } from "../lib/agent/transcriptState";
import { firstLineOf } from "../lib/agent/toolText";
import { ToolCaptionLine } from "./ToolCaptionLine";
import { ToolStateLine } from "./ToolStateLine";
import { mutedText } from "../lib/ui/theme";
import {
  toolBodyColumn,
  toolGapColumn,
  toolGrow,
  toolLine,
} from "../lib/ui/toolRows";
import {
  METER_TRACK_WIDTH,
  meterFill,
  toolBadgeVariant,
  toolChip,
  toolChipLine,
  toolDataRow,
  toolIdText,
  toolKeyColumn,
  toolMonoGrow,
  toolToneColor,
  type ToolPaintRow,
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
        height: t.type.micro,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          height: 4,
          borderRadius: 2,
          backgroundColor: t.color.divider.faint,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width,
            height: 4,
            borderRadius: 2,
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
          paddingLeft: t.type.caption * 7.5 + t.space.md,
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
export function ToolDataRow({
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
  const line = firstLineOf(item.output);
  if (item.status === "error")
    return (
      <ToolStateNote
        icon="cancel"
        tone="bad"
        text={line === "" ? `${tool} failed` : line}
      />
    );
  return <ToolStateNote icon="info" text={line} />;
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
    <ToolCaptionLine color={toolToneColor(t, tone)} text={text} weight={600} />
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
export function ToolSectionHead({ text }: { text: string }): JSX.Element | null {
  const t = useAdwaita();
  if (text === "") return null;
  return (
    <div style={{ ...toolLine(t), paddingTop: t.space.sm }}>
      <T size="caption" color={mutedText(t)} weight={600} style={toolGrow}>
        {text}
      </T>
    </div>
  );
}

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
        <Spinner size={16} color="accent" style={{ flexShrink: 0 }} />
        <T size="caption" color={mutedText(t)} style={toolGrow}>
          {text}
        </T>
      </div>
      <div style={{ ...toolLine(t), gap: t.space.xs, flexWrap: "wrap" }}>
        {[0, 1, 2].map((i) => (
          <Skeleton
            key={i}
            width={t.control.compactIconSize * (i === 1 ? 8 : 6)}
            height={t.type.micro}
          />
        ))}
      </div>
      {[...Array(rows).keys()].map((i) => (
        <div key={i} style={{ ...toolLine(t), pointerEvents: "none" }}>
          <Skeleton width={t.type.caption * 6} height={t.type.caption} />
          <Skeleton width={t.control.filterEntryWidth} height={t.type.caption} />
        </div>
      ))}
    </div>
  );
}
