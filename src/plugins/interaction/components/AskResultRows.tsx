import type { JSX } from "react";
import { Icon, T, useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { mutedText } from "../../core/lib/ui/theme";
import { STATE_GLYPH } from "../../core/lib/ui/tokens";
import {
  toolGapColumn,
  toolLineFlush,
  toolMark,
  toolText,
} from "../../core/lib/ui/toolRows";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { ASK_TOOL_NAME } from "../constants";
import type { AskUserDetails } from "../types";

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

  if (item.status === "error") {
    return (
      <div style={toolGapColumn(t)}>
        <div style={toolLineFlush(t)}>
          <Icon
            name="cancel"
            size={STATE_GLYPH}
            color={t.color.functional.destructive}
            style={toolMark}
          />
          <T
            size="caption"
            color={t.color.functional.destructive}
            style={toolText(t)}
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
      <div style={toolGapColumn(t)}>
        <div style={toolLineFlush(t)}>
          <Icon
            name="schedule"
            size={STATE_GLYPH}
            color={mutedText(t)}
            style={toolMark}
          />
          <T size="caption" color={mutedText(t)} style={toolText(t)}>
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
      <div style={toolGapColumn(t)}>
        <div style={toolLineFlush(t)}>
          <Icon
            name="block"
            size={STATE_GLYPH}
            color={t.color.functional.warning}
            style={toolMark}
          />
          <T
            size="caption"
            color={t.color.functional.warning}
            style={toolText(t)}
          >
            {`Cancelled${note}`}
          </T>
        </div>
      </div>
    );
  }

  return (
    <div style={toolGapColumn(t)}>
      {answers.map((answer, i) => {
        const chosen =
          answer.selected.length > 0
            ? answer.selected.join(", ")
            : "(typed answer)";
        const prefix =
          answers.length > 1 ? `${i + 1}. [${answer.id}] ` : `[${answer.id}] `;
        return (
          <div key={`${answer.id}-${i}`} style={answerColumn(t)}>
            <div style={toolLineFlush(t)}>
              <Icon
                name={answer.selected.length > 0 ? "checkCircle" : "edit"}
                size={STATE_GLYPH}
                color={t.color.functional.success}
                style={toolMark}
              />
              <T
                size="caption"
                color={t.color.text.primary}
                style={toolText(t)}
              >
                {`${prefix}${chosen}`}
              </T>
            </div>
            {answer.custom !== undefined && (
              <div style={toolLineFlush(t)}>
                <T size="caption" color={mutedText(t)} style={toolText(t)}>
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

/** An answer's lines: the chosen options, then anything the reader typed. */
const answerColumn = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  gap: t.space.xs,
  minWidth: 0,
  flexShrink: 1,
});
