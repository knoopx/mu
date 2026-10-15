import { Icon, useAdwaita, type IconName } from "adwaita-gpuix";
import { type JSX } from "react";
import { type StyleDesc } from "@gpuix/react";

import { mutedText } from "../lib/ui/theme";
import {
  BAR,
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
  const size = t.type.caption;
  const glyph = Math.round(size * 0.92);
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
  const separator: StyleDesc = { ...figure, color: t.color.text.dim };

  const nodes = props.segments.flatMap((segment, i): JSX.Element[] => {
    const out: JSX.Element[] = [];
    if (i > 0)
      out.push(
        <text key={`sep-${i}`} style={separator}>
          {props.separator}
        </text>,
      );
    if (segment.icon !== undefined)
      out.push(
        <Icon
          key={`icon-${i}`}
          name={segment.icon}
          size={glyph}
          color={muted}
          style={{ flexShrink: 0, userSelect: "none" }}
        />,
      );
    out.push(
      <text key={`text-${i}`} style={figure}>
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
    <StatsLine segments={turnSegments(stats)} separator={BAR} style={style} />
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
