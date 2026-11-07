import type { JSX } from "react";
import { Icon, T, useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { mutedText } from "../../core/lib/ui/theme";
import {
  toolGapColumn,
  toolGrow,
  toolLineFlush,
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
            size={t.control.navIconSize}
            color={t.color.functional.destructive}
            style={{ flexShrink: 0 }}
          />
          <T
            size="caption"
            color={t.color.functional.destructive}
            style={toolGrow}
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
      <div style={toolGapColumn(t)}>
        <div style={toolLineFlush(t)}>
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
    <div style={toolGapColumn(t)}>
      {answers.map((answer, i) => {
        const chosen =
          answer.selected.length > 0
            ? answer.selected.join(", ")
            : "(typed answer)";
        const prefix =
          answers.length > 1 ? `${i + 1}. [${answer.id}] ` : `[${answer.id}] `;
        return (
          <div key={`${answer.id}-${i}`} style={answerColumn}>
            <div style={toolLineFlush(t)}>
              <Icon
                name={answer.selected.length > 0 ? "checkCircle" : "edit"}
                size={t.control.navIconSize}
                color={t.color.functional.success}
                style={{ flexShrink: 0 }}
              />
              <T size="caption" color={t.color.text.primary} style={toolGrow}>
                {`${prefix}${chosen}`}
              </T>
            </div>
            {answer.custom !== undefined && (
              <div style={toolLineFlush(t)}>
                <div style={indent(t)} aria-hidden />
                <T size="caption" color={mutedText(t)} style={toolGrow}>
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

const answerColumn: StyleDesc = {
  display: "flex",
  flexDirection: "column",
  gap: 2,
  minWidth: 0,
  flexShrink: 1,
};

/** The spacer that holds an answer's typed text under the chosen options. */
function indent(t: AdwaitaTheme): StyleDesc {
  return {
    width: t.control.navIconSize,
    flexShrink: 0,
    pointerEvents: "none",
  };
}
