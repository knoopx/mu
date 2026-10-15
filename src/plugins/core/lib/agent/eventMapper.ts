import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { joinTextParts } from "./content";
import { eventActions, type MapEventContext } from "./eventHandlers";
import type { TranscriptAction } from "./transcriptState";

export type { MapEventContext } from "./eventHandlers";

export function mapEvent(
  e: AgentSessionEvent,
  ctx: MapEventContext = {},
): TranscriptAction[] {
  return eventActions(e, ctx);
}

function userMessageText(e: AgentSessionEvent): string | undefined {
  if (
    e.type === "message_start" &&
    (e.message as { role?: string })?.role === "user"
  ) {
    return joinTextParts((e.message as { content?: unknown })?.content, "");
  }
  return undefined;
}
