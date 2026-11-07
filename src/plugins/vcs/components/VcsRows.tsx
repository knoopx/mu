/**
 * The row primitives every vcs tool view is built from: a chip line of the
 * resolved identities, a data row, a summary line, a state line, and the
 * running block. Nothing here knows a tool — `VcsToolRows` and
 * `VcsSplitRows` compose these, and every colour and size is a theme token.
 */

import type { JSX } from "react";
import {
  Badge,
  Skeleton,
  Spinner,
  T,
  rowHoverBg,
  useAdwaita,
  type AdwaitaTheme,
  type BadgeVariant,
  type IconName,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import { ToolStateLine } from "../../core/components/ToolStateLine";
import { mutedText } from "../../core/lib/ui/theme";
import {
  toolBodyColumn,
  toolGapColumn,
  toolGrow,
  toolLine,
} from "../../core/lib/ui/toolRows";
import type { VcsCell, VcsRowView, VcsToolView } from "../types";

/** The colour roles a vcs line can paint. */
export type VcsTone = "neutral" | "accent" | "ok" | "warn" | "bad";

/** The one colour a tone paints, from the theme's functional and text roles. */
function vcsToneColor(t: AdwaitaTheme, tone: VcsTone): string {
  if (tone === "bad") return t.color.functional.destructive;
  if (tone === "warn") return t.color.functional.warning;
  if (tone === "ok") return t.color.functional.success;
  if (tone === "accent") return t.color.accent.base;
  return mutedText(t);
}

/** Accent for the change a call made, neutral for every other badge. */
function vcsBadgeVariant(badge: string): BadgeVariant {
  const key = badge.toLowerCase();
  if (key === "selected" || key === "after") return "default";
  if (key === "before" || key === "remaining") return "secondary";
  if (key === "working copy") return "warning";
  if (key === "placement") return "secondary";
  return "outline";
}

/** The value of one chip, read by a view that paints that chip itself. */
export function vcsCellOf(view: VcsToolView, label: string): string {
  return view.cells.find((cell) => cell.label === label)?.value ?? "";
}

/** The id column shows an id short; a hunk id keeps its `hunk-` prefix. */
const ID_MAX = 13;

function vcsIdText(key: string): string {
  return key.length <= ID_MAX ? key : `${key.slice(0, ID_MAX)}…`;
}

const monoGrow = (t: AdwaitaTheme): StyleDesc => ({
  ...toolGrow,
  fontFamily: t.type.fontFamilyMono,
});

function chipLine(t: AdwaitaTheme): StyleDesc {
  return {
    ...toolLine(t),
    flexWrap: "wrap",
    gap: t.space.xs,
    paddingTop: 0,
  };
}

function chip(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs,
    paddingLeft: t.space.xs + 2,
    paddingRight: t.space.xs + 2,
    paddingTop: 2,
    paddingBottom: 2,
    borderRadius: t.radius.sm,
    borderWidth: t.control.dividerThickness,
    borderColor: t.color.divider.faint,
    backgroundColor: t.color.surface.button,
    flexShrink: 0,
  };
}

function dataRow(t: AdwaitaTheme, first: boolean): StyleDesc {
  return {
    ...toolLine(t),
    gap: t.space.md,
    marginLeft: -t.space.sm,
    marginRight: -t.space.sm,
    paddingLeft: t.space.sm,
    paddingRight: t.space.sm,
    borderRadius: t.radius.sm,
    borderTopWidth: first ? 0 : t.control.dividerThickness,
    borderColor: t.color.divider.faint,
    hover: { backgroundColor: rowHoverBg(t) },
    active: { backgroundColor: t.color.surface.active },
  };
}

function idColumn(t: AdwaitaTheme): StyleDesc {
  return {
    width: t.type.caption * 7.5,
    flexShrink: 0,
    fontFamily: t.type.fontFamilyMono,
    pointerEvents: "none",
  };
}

/**
 * The resolved identities of a call — `rev`, `git`, `change`, `path` — as a
 * wrapping line of label/value chips, the values in mono.
 */
export function VcsChips({
  cells,
}: {
  cells: readonly VcsCell[];
}): JSX.Element | null {
  const t = useAdwaita();
  const shown = cells.filter((cell) => cell.value !== "");
  if (shown.length === 0) return null;

  return (
    <div style={chipLine(t)}>
      {shown.map((cell) => (
        <div key={`${cell.label}/${cell.value}`} style={chip(t)}>
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

/**
 * One data row: the id in a mono key column, the thing that row is about, a
 * muted secondary line, and a Badge when the row carries a state.
 */
export function VcsDataRow({
  row,
  first,
}: {
  row: VcsRowView;
  first: boolean;
}): JSX.Element {
  const t = useAdwaita();
  const badge = row.badge.trim();

  return (
    <div style={dataRow(t, first)}>
      <T size="caption" color={mutedText(t)} style={idColumn(t)}>
        {vcsIdText(row.key)}
      </T>
      <div style={toolBodyColumn}>
        <T
          size="list"
          color={row.primary === "" ? mutedText(t) : t.color.text.primary}
          style={toolGrow}
        >
          {row.primary === "" ? "—" : row.primary}
        </T>
        {row.secondary === "" ? null : (
          <T size="caption" color={mutedText(t)} style={monoGrow(t)}>
            {row.secondary}
          </T>
        )}
      </div>
      {badge === "" ? null : (
        <Badge
          size="sm"
          variant={vcsBadgeVariant(badge)}
          style={{ flexShrink: 0 }}
        >
          {badge}
        </Badge>
      )}
    </div>
  );
}

/** The count line above a table of rows — how much the call read. */
export function VcsSummary({
  text,
  tone = "neutral",
}: {
  text: string;
  tone?: VcsTone;
}): JSX.Element | null {
  const t = useAdwaita();
  if (text === "") return null;
  return (
    <ToolCaptionLine color={vcsToneColor(t, tone)} text={text} weight={600} />
  );
}

/** A state the log has to say in words — an error, a scope with nothing in it. */
export function VcsStateLine({
  icon,
  text,
  tone = "neutral",
}: {
  icon: IconName;
  text: string;
  tone?: VcsTone;
}): JSX.Element | null {
  const t = useAdwaita();
  if (text === "") return null;
  return (
    <ToolStateLine icon={icon} color={vcsToneColor(t, tone)} text={text} />
  );
}

/** The running block: a spinner with what is being read, then skeleton rows. */
export function VcsRunning({
  text,
  rows = 3,
}: {
  text: string;
  rows?: number;
}): JSX.Element {
  const t = useAdwaita();
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
          <Skeleton
            width={t.control.filterEntryWidth}
            height={t.type.caption}
          />
        </div>
      ))}
    </div>
  );
}
