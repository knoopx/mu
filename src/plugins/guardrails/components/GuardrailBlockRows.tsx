import type { JSX } from "react";
import { Icon, T, useAdwaita } from "adwaita-gpuix";

import { STATE_GLYPH } from "../../core/lib/ui/tokens";
import {
  toolGapColumn,
  toolLineFlush,
  toolMark,
  toolText,
} from "../../core/lib/ui/toolRows";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { guardrailsStore } from "../lib/store";
import type { GuardrailHit } from "../types";

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
 * A line hanging under the one that names the rule. The mark of that first
 * line hangs into the page inset rather than taking a column of its own, so
 * every line of the block already starts at the log's text column.
 */
function Detail({ text, color }: { text: string; color: string }): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={toolLineFlush(t)}>
      <T size="caption" color={color} style={toolText(t)}>
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
          size={STATE_GLYPH}
          color={t.color.functional.destructive}
          style={toolMark}
        />
        <T
          size="caption"
          color={t.color.functional.destructive}
          style={toolText(t)}
        >
          {`Guardrail ${hit.ruleId} · ${hit.domain}`}
        </T>
      </div>
      <Detail text={hit.message} color={t.color.text.primary} />
    </div>
  );
}
