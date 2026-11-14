/**
 * `openui-events` — read what the human did in a drawn program.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  DEFAULT_EVENT_LIMIT,
  MAX_EVENT_LIMIT,
  OPENUI_EVENTS_TOOL,
} from "../constants";
import type { OpenUIEventsDetails } from "../types";
import {
  blocks,
  counted,
  statusTable,
  toolResult,
} from "../../core/lib/agent/toolText";
import { eventLines } from "../lib/format";
import { programStore } from "../lib/programStore/store";
import { unknownProgram } from "../lib/answer";
import { EVENTS_GUIDELINES } from "./guidelines";

const EventsParametersSchema = Type.Object({
  name: Type.Optional(
    Type.String({
      maxLength: 48,
      description:
        "Program to read events from (default: every program in the log, oldest first).",
    }),
  ),
  clear: Type.Optional(
    Type.Boolean({
      description: "Drain the log after reading it (default true).",
    }),
  ),
});

/** The oldest interaction in a program that is not the one named. */
function oldestAcross(programs: string[]): { name: string; at: number } | null {
  let oldest: { name: string; at: number } | null = null;
  for (const record of programStore.list()) {
    if (record.events.length === 0) continue;
    if (programs.length > 0 && !programs.includes(record.name)) continue;
    const at = record.events[0]?.at ?? 0;
    if (oldest === null || at < oldest.at) oldest = { name: record.name, at };
  }
  return oldest;
}

export const openUIEventsTool: ToolDefinition<
  typeof EventsParametersSchema,
  OpenUIEventsDetails
> = {
  name: OPENUI_EVENTS_TOOL,
  label: OPENUI_EVENTS_TOOL,
  description:
    "Read the interaction the human produced in the rendered program — button clicks, form submits with their field values, selection and switch changes — each `{ at, type, message, params?, formState?, formName? }`. Draining by default, so every event is delivered exactly once. This closes the loop: render, let the human operate the screen, then act on what they did.",
  promptSnippet: "Read what the human did in the rendered program",
  promptGuidelines: [...EVENTS_GUIDELINES],

  executionMode: "sequential",
  parameters: EventsParametersSchema,

  async execute(
    _toolCallId,
    params,
  ): Promise<AgentToolResult<OpenUIEventsDetails>> {
    const clear = params.clear !== false;
    const named = params.name ?? "";

    if (named !== "" && !programStore.has(named)) {
      const details: OpenUIEventsDetails = {
        status: "unknown",
        error: unknownProgram(named),
        name: named,
        events: [],
        waiting: 0,
        omitted: 0,
        cleared: false,
      };
      return toolResult(
        blocks("no program to read interactions from", details.error),
        details,
      );
    }

    if (named === "") {
      const oldest = oldestAcross([]);
      if (oldest === null) {
        const details: OpenUIEventsDetails = {
          status: "empty",
          error: "",
          name: "",
          events: [],
          waiting: 0,
          omitted: 0,
          cleared: false,
        };
        return toolResult(
          blocks("no interaction is waiting in any program"),
          details,
        );
      }
      const drained = programStore.drain(
        oldest.name,
        DEFAULT_EVENT_LIMIT,
        clear,
      );
      const details: OpenUIEventsDetails = {
        status: "ok",
        error: "",
        name: oldest.name,
        events: drained.events,
        waiting: drained.waiting,
        omitted: drained.omitted,
        cleared: clear,
      };
      return toolResult(
        blocks(
          statusTable({
            program: oldest.name,
            interactions: details.events.length,
            waiting: details.waiting,
            drained: clear ? "yes" : "no",
          }),
          eventLines(details.events),
        ),
        details,
      );
    }

    const drained = programStore.drain(named, MAX_EVENT_LIMIT, clear);
    const details: OpenUIEventsDetails = {
      status: drained.events.length === 0 ? "empty" : "ok",
      error: "",
      name: named,
      events: drained.events,
      waiting: drained.waiting,
      omitted: drained.omitted,
      cleared: clear,
    };

    return toolResult(
      blocks(
        statusTable({
          program: named,
          interactions: details.events.length,
          waiting: details.waiting,
          drained: clear ? "yes" : "no",
        }),
        eventLines(details.events),
        details.events.length === 0
          ? "nobody used this program yet — change it rather than assume it worked"
          : counted(details.events.length, "interaction") +
              (details.omitted === 0
                ? ""
                : ` (${String(details.omitted)} still waiting)`),
      ),
      details,
    );
  },
};
