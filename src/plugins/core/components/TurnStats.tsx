import { Icon, useAdwaita, type IconName } from "adwaita-gpuix";
import { type JSX } from "react";
import { type StyleDesc } from "@gpuix/react";

import { mutedText } from "../lib/ui/theme";
import { glyphForText } from "../lib/ui/tokens";
import {
  DOT,
  formatCost,
  formatDuration,
  formatInboundOutbound,
  formatOutbound,
  formatTokensPerSecond,
  type ConversationStats,
  type TurnStats,
} from "../lib/agent/turnStats";

interface Segment {
  icon?: IconName;
  text: string;

  /** A figure the run is still moving — a rate read off a decode in flight —
   * stands in the accent so it reads as the live one, not a settled record. */
  live?: boolean;
}

function turnSegments(stats: TurnStats): Segment[] {
  const segments: Segment[] = [
    { text: formatOutbound(stats.output) },
    { icon: "schedule", text: formatDuration(stats.durMs) },
    { icon: "bolt", text: formatTokensPerSecond(stats.tpsOutput, stats.genMs) },
  ];
  const cost = formatCost(stats.cost);
  if (cost !== "") segments.push({ text: cost });
  return segments;
}

function conversationSegments(stats: ConversationStats): Segment[] {
  const segments: Segment[] = [
    {
      icon: "rotateLeft",
      text: `${stats.turns} ${stats.turns === 1 ? "turn" : "turns"}`,
    },
  ];
  const inOut = formatInboundOutbound(stats.input, stats.output);
  if (inOut !== "") segments.push({ text: inOut });
  segments.push({ icon: "schedule", text: formatDuration(stats.durMs) });
  segments.push({
    icon: "bolt",
    text: formatTokensPerSecond(stats.tpsOutput, stats.genMs),
    live: stats.live,
  });
  const cost = formatCost(stats.cost);
  if (cost !== "") segments.push({ text: cost });
  return segments;
}

function StatsLine(props: {
  segments: Segment[];
  separator: string;
  style?: Partial<StyleDesc>;
}): JSX.Element {
  const t = useAdwaita();
  const muted = mutedText(t);
  const live = t.color.accent.base;
  const size = t.type.caption;
  // A mark in a stat line stands beside figures of this size and takes its measure.
  const glyph = glyphForText(size);
  const row: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.xs,
    flexShrink: 0,
    minWidth: 0,
    userSelect: "none",
    ...props.style,
  };
  const figure: StyleDesc = {
    fontSize: size,
    fontFamily: t.type.fontFamilyMono,
    color: muted,
    whiteSpace: "nowrap",
    flexShrink: 0,
    userSelect: "none",
  };
  const separator: StyleDesc = { ...figure, color: muted };

  const nodes = props.segments.flatMap((segment, i): JSX.Element[] => {
    const out: JSX.Element[] = [];
    if (i > 0)
      out.push(
        <text key={`sep-${i}`} style={separator}>
          {props.separator}
        </text>,
      );
    const ink = segment.live === true ? live : muted;
    if (segment.icon !== undefined)
      out.push(
        <Icon
          key={`icon-${i}`}
          name={segment.icon}
          size={glyph}
          color={ink}
          style={{ flexShrink: 0, userSelect: "none" }}
        />,
      );
    out.push(
      <text key={`text-${i}`} style={{ ...figure, color: ink }}>
        {segment.text}
      </text>,
    );
    return out;
  });

  return <div style={row}>{nodes}</div>;
}

export interface TurnStatsProps {
  stats: TurnStats;
  style?: Partial<StyleDesc>;
}

export function TurnStatsLine({ stats, style }: TurnStatsProps): JSX.Element {
  return (
    // One separator for the figures of a run, wherever they are read: a turn's own
    // footer and the bar at the foot of the window print the same numbers thirty
    // pixels apart, and a `|` up top against a `·` below reads as two kinds of
    // figure where there is one.
    <StatsLine segments={turnSegments(stats)} separator={DOT} style={style} />
  );
}

export interface ConversationStatsProps {
  stats: ConversationStats;
  style?: Partial<StyleDesc>;
}

export function ConversationStatsLine({
  stats,
  style,
}: ConversationStatsProps): JSX.Element {
  return (
    <StatsLine
      segments={conversationSegments(stats)}
      separator={DOT}
      style={style}
    />
  );
}
