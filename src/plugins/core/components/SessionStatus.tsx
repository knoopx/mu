import { type JSX } from "react";
import { useAdwaita } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";
import { centerRow } from "../lib/ui/layout";
import { mutedText } from "../lib/ui/theme";
import { ROW_HEIGHT } from "../lib/ui/tokens";
import { ConversationStatsLine } from "./TurnStats";
import type { ConversationStats } from "../lib/agent/turnStats";

export interface SessionStatusProps {
  projectPath: string;

  /** the bookmark the working copy stands on; nothing is shown when it is null */
  bookmark: string | null;

  stats?: ConversationStats | null;

  progress?: string | null;
}

function Segment(props: {
  text: string;
  color: string;
  shrink?: boolean;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <text
      style={{
        fontSize: t.type.caption,
        fontFamily: t.type.fontFamily,
        color: props.color,
        whiteSpace: "nowrap",
        flexShrink: props.shrink === true ? 1 : 0,
        minWidth: 0,
        textOverflow: props.shrink === true ? "ellipsis" : undefined,
        userSelect: "none",
      }}
    >
      {props.text}
    </text>
  );
}

function AskProgress(props: { text: string }): JSX.Element {
  const t = useAdwaita();
  return <Segment text={props.text} color={t.color.accent.base} />;
}

export function SessionStatus(props: SessionStatusProps): JSX.Element {
  const t = useAdwaita();
  const muted = mutedText(t);

  const root: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.md,
    height: ROW_HEIGHT,
    flexShrink: 0,
    paddingLeft: 0,
    paddingRight: 0,
    userSelect: "none",
  };

  const bookmark =
    props.bookmark !== null && props.bookmark.length > 0
      ? props.bookmark
      : null;

  return (
    <div style={root}>
      <div style={centerRow(t.space.xs, { flexGrow: 1, flexShrink: 1 })}>
        <Segment text={props.projectPath} color={muted} shrink />
        {bookmark !== null ? <Segment text={bookmark} color={muted} /> : null}
      </div>
      {props.progress != null ? (
        <AskProgress text={props.progress} />
      ) : props.stats != null ? (
        <ConversationStatsLine stats={props.stats} />
      ) : null}
    </div>
  );
}
