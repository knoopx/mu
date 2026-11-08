import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { OPENUI_EVENTS_TOOL, OPENUI_TOOL_LABELS } from "../constants";
import { programStore, type OpenuiEvent } from "../lib/programStore";
import {
  blocks,
  statusTable,
  tableOf,
  toolResult,
} from "../../core/lib/agent/toolText";
import { clock, valueText } from "../lib/format";
import type { OpenuiEventsDetails, OpenuiEventsParams } from "../types";

const Parameters = Type.Object({
  name: Type.Optional(
    Type.String({
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

const eventCells = (event: OpenuiEvent): Record<string, string> => ({
  at: clock(event.at),
  type: event.type,
  message: event.message,
  form: event.formName ?? "",
  params:
    event.formState === undefined
      ? event.params === undefined
        ? ""
        : Object.keys(event.params).join(", ")
      : Object.keys(event.formState).join(", "),
});

/** The form a submit carried, in the order the human filled it in. */
const formBlock = (events: readonly OpenuiEvent[]): string => {
  const lines: string[] = [];
  for (const event of events) {
    if (event.formState === undefined) continue;
    const filled = Object.entries(event.formState).map(
      ([name, value]) => `  ${name} = ${valueText(value)}`,
    );
    if (filled.length === 0) continue;
    lines.push(`${event.message}${event.formName === undefined ? "" : ` (${event.formName})`}:`);
    lines.push(...filled);
  }
  return lines.join("\n");
};

async function executeOpenuiEvents(
  params: OpenuiEventsParams,
): Promise<AgentToolResult<OpenuiEventsDetails>> {
  const clear = params.clear !== false;
  const events = programStore.takeEvents(params.name, clear);

  const body = blocks(
    statusTable({
      program: params.name ?? "*",
      events: events.length,
      cleared: clear ? "yes" : "no",
    }),
    events.length === 0
      ? "the human has not clicked, typed or submitted anything in this program yet"
      : tableOf(events.map(eventCells)),
    formBlock(events),
    events.length === 0
      ? ""
      : "act on what they did: this is the answer the program was built to collect",
  );

  return toolResult(body, {
    status: events.length === 0 ? "empty" : "ok",
    program: params.name ?? "",
    cleared: clear,
    count: events.length,
    events,
  });
}

export const openuiEventsTool: ToolDefinition<
  typeof Parameters,
  OpenuiEventsDetails
> = {
  name: OPENUI_EVENTS_TOOL,
  label: OPENUI_TOOL_LABELS[OPENUI_EVENTS_TOOL],
  description:
    "Read the interaction the human produced in the rendered program — button clicks, form " +
    "submits with their field values, selection and switch changes — each `{ at, type, " +
    "message, params?, formState?, formName? }`. Drains by default, so every event is " +
    "delivered exactly once. This closes the loop: render, let the human operate the screen, " +
    "then act on what they did.",
  promptSnippet: "Read what the human clicked, typed or submitted in a program",
  promptGuidelines: [
    "Drain openui-events after a program lands instead of asking the human to describe what they pressed.",
    "`clear: false` is for re-reading the same events; leave it off only when a turn may need them twice.",
    "A program with no events is a screen nobody used yet — change it rather than assuming it worked.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeOpenuiEvents(params);
  },
};