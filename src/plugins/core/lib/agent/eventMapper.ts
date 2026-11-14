import type { AgentSessionEvent } from "@earendil-works/pi-coding-agent";
import { eventActions, type MapEventContext } from "./eventHandlers";
import type { TranscriptAction } from "./transcriptState";

export type { MapEventContext } from "./eventHandlers";

export function mapEvent(
  e: AgentSessionEvent,
  ctx: MapEventContext = {},
): TranscriptAction[] {
  return eventActions(e, ctx);
}
