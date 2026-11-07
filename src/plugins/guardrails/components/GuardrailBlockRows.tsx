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
import { guardrailsStore } from "../lib/store";
import type { GuardrailHit } from "../types";

/** The spacer that holds a continuation line under the text beside the icon. */
function indent(t: AdwaitaTheme): StyleDesc {
  return { width: t.control.navIconSize, flexShrink: 0 };
}

/**
 * The guardrail that stopped this tool call, when one did.
 *
 * The hit is keyed by tool call id, which the transcript item carries, so the
 * row needs nothing from the block reason the model was handed.
 */
export function guardrailBlockOf(
  item: ToolTranscriptItem,
): GuardrailHit | null {
  if (item.status !== "error") return null;
  const hit = guardrailsStore.hitFor(item.toolCallId);
  return hit !== undefined && hit.blocked ? hit : null;
}

/**
 * A line hanging under the one above it, held in step with the icon column so
 * the block reads as one statement with the rule named first.
 */
function Indented({
  text,
  color,
}: {
  text: string;
  color: string;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={toolLineFlush(t)}>
      <div style={indent(t)} aria-hidden />
      <T size="caption" color={color} style={toolGrow}>
        {text}
      </T>
    </div>
  );
}

export function GuardrailBlockRows({
  hit,
}: {
  hit: GuardrailHit;
}): JSX.Element {
  const t = useAdwaita();

  return (
    <div style={toolGapColumn(t)}>
      <div style={toolLineFlush(t)}>
        <Icon
          name="block"
          size={t.control.navIconSize}
          color={t.color.functional.destructive}
          style={{ flexShrink: 0 }}
        />
        <T
          size="caption"
          color={t.color.functional.destructive}
          style={toolGrow}
        >
          {`Guardrail ${hit.ruleId} · ${hit.domain}`}
        </T>
      </div>
      <Indented text={hit.message} color={t.color.text.primary} />
      <Indented
        text={`read ${String(hit.engineMs)}ms · disarmed in /guardrails`}
        color={mutedText(t)}
      />
    </div>
  );
}
