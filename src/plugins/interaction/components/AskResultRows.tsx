import type { JSX } from "react";
import { Icon, T, useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { mutedText } from "../../core/lib/ui/theme";
import type { TranscriptItem } from "../../core/lib/agent/transcriptState";
import { ASK_TOOL_NAME } from "../constants";
import type { AskUserDetails } from "../types";

type ToolTranscriptItem = Extract<TranscriptItem, { kind: "tool" }>;

export function isAskTool(name: string): boolean {
  return name.toLowerCase() === ASK_TOOL_NAME;
}

export function askDetailsOf(
  item: ToolTranscriptItem,
): AskUserDetails | undefined {
  const details = item.details as AskUserDetails | undefined;
  if (details === undefined || details === null || typeof details !== "object")
    return undefined;
  return Array.isArray(details.answers) ? details : undefined;
}

export function AskResultRows({
  item,
}: {
  item: ToolTranscriptItem;
}): JSX.Element {
  const t = useAdwaita();
  const details = askDetailsOf(item);

  const column: StyleDesc = {
    display: "flex",
    flexDirection: "column",
    gap: t.space.xs,
    paddingLeft: t.space.sm,
    paddingRight: t.space.sm,
    flexShrink: 1,
    minWidth: 0,
  };

  if (item.status === "error") {
    return (
      <div style={column}>
        <div style={line(t)}>
          <Icon
            name="cancel"
            size={t.control.navIconSize}
            color={t.color.functional.destructive}
            style={{ flexShrink: 0 }}
          />
          <T
            size="caption"
            color={t.color.functional.destructive}
            style={{ flexShrink: 1, minWidth: 0 }}
          >
            {item.output.trim() === ""
              ? "Ask was rejected"
              : item.output.trim()}
          </T>
        </div>
      </div>
    );
  }

  const running = item.status === "running";
  if (
    details === undefined ||
    (running && (details.answers ?? []).length === 0)
  ) {
    return (
      <div style={column}>
        <div style={line(t)}>
          <Icon
            name="schedule"
            size={t.control.navIconSize}
            color={mutedText(t)}
            style={{ flexShrink: 0 }}
          />
          <T size="caption" color={mutedText(t)}>
            Waiting for the answer in the composer
          </T>
        </div>
      </div>
    );
  }

  const answers = details.answers ?? [];
  if (details.cancelled || answers.length === 0) {
    const note =
      answers.length > 0
        ? ` · answered ${answers.length} before cancelling`
        : "";
    return (
      <div style={column}>
        <div style={line(t)}>
          <Icon
            name="block"
            size={t.control.navIconSize}
            color={t.color.functional.warning}
            style={{ flexShrink: 0 }}
          />
          <T size="caption" color={t.color.functional.warning}>
            {`Cancelled${note}`}
          </T>
        </div>
      </div>
    );
  }

  return (
    <div style={column}>
      {answers.map((answer, i) => {
        const chosen =
          answer.selected.length > 0
            ? answer.selected.join(", ")
            : "(typed answer)";
        const prefix =
          answers.length > 1 ? `${i + 1}. [${answer.id}] ` : `[${answer.id}] `;
        return (
          <div key={`${answer.id}-${i}`} style={answerColumn(t)}>
            <div style={line(t)}>
              <Icon
                name={answer.selected.length > 0 ? "checkCircle" : "edit"}
                size={t.control.navIconSize}
                color={t.color.functional.success}
                style={{ flexShrink: 0 }}
              />
              <T
                size="caption"
                color={t.color.text.primary}
                style={{ flexShrink: 1, minWidth: 0 }}
              >
                {`${prefix}${chosen}`}
              </T>
            </div>
            {answer.custom !== undefined && (
              <div style={line(t)}>
                <div
                  style={{
                    width: t.control.navIconSize,
                    flexShrink: 0,
                    pointerEvents: "none",
                  }}
                />
                <T
                  size="caption"
                  color={mutedText(t)}
                  style={{ flexShrink: 1, minWidth: 0 }}
                >
                  {answer.custom}
                </T>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function answerColumn(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minWidth: 0,
    flexShrink: 1,
  };
}

function line(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
    minWidth: 0,
    flexShrink: 0,
  };
}
