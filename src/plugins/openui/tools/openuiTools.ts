/**
 * `openui-tools` — the data a program's `Query` calls read.
 *
 * This app has no backends for a program to call, so the JSON a tool serves
 * here *is* the program's data, and a `Query` whose name was never served
 * fails as a missing tool rather than inventing a row.
 */

import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  MAX_FIXTURE_CHARS,
  MAX_FIXTURE_KEYS,
  OPENUI_TOOLS_TOOL,
} from "../constants";
import type { OpenUIFixturesDetails } from "../types";
import {
  blocks,
  counted,
  statusTable,
  toolResult,
} from "../../core/lib/agent/toolText";
import { programStore } from "../lib/programStore/store";
import { refreshQueries } from "../lib/analysis/run";
import { FIXTURES_GUIDELINES } from "./guidelines";

const FixturesParametersSchema = Type.Object({
  fixtures: Type.Object(
    {},
    {
      additionalProperties: Type.Unknown(),
      description:
        "tool name -> the JSON a Query(name, args, default) call in the program should " +
        "resolve to. An empty object clears them.",
    },
  ),
});

const sizeOf = (fixtures: Record<string, unknown>): number => {
  try {
    return JSON.stringify(fixtures).length;
  } catch {
    return 0;
  }
};

export const openUIToolsTool: ToolDefinition<
  typeof FixturesParametersSchema,
  OpenUIFixturesDetails
> = {
  name: OPENUI_TOOLS_TOOL,
  label: OPENUI_TOOLS_TOOL,
  description:
    'Replace the data served to a program\'s `Query("tool", args, default)` calls. ' +
    "This app has no backends of its own for a program to call: whatever JSON is put here is exactly what the rendered screen shows, " +
    "and the programs in the log re-draw as soon as it is set. Pass an empty object to clear it.",
  promptSnippet: "Serve the data a program's Query() calls resolve to",
  promptGuidelines: [...FIXTURES_GUIDELINES],

  executionMode: "sequential",
  parameters: FixturesParametersSchema,

  async execute(
    _toolCallId,
    params,
  ): Promise<AgentToolResult<OpenUIFixturesDetails>> {
    const fixtures = (params?.fixtures ?? {}) as Record<string, unknown>;
    const names = Object.keys(fixtures);

    if (names.length > MAX_FIXTURE_KEYS) {
      const details: OpenUIFixturesDetails = {
        status: "failed",
        error: `${String(names.length)} names is over this app's limit of ${String(MAX_FIXTURE_KEYS)}`,
        names,
        cleared: false,
        chars: sizeOf(fixtures),
        refreshed: programStore.count(),
      };
      return toolResult(
        blocks("the fixtures were not served", details.error),
        details,
      );
    }

    const chars = sizeOf(fixtures);
    if (chars > MAX_FIXTURE_CHARS) {
      const details: OpenUIFixturesDetails = {
        status: "failed",
        error: `${String(chars)} characters of fixtures is over this app's limit of ${String(MAX_FIXTURE_CHARS)}`,
        names,
        cleared: false,
        chars,
        refreshed: programStore.count(),
      };
      return toolResult(
        blocks("the fixtures were not served", details.error),
        details,
      );
    }

    const served = programStore.setFixtures(fixtures);
    refreshQueries();

    const details: OpenUIFixturesDetails = {
      status: served.names.length === 0 ? "empty" : "ok",
      error: "",
      names: served.names,
      cleared: served.cleared,
      chars,
      refreshed: programStore.count(),
    };

    return toolResult(
      blocks(
        statusTable({
          keys: details.names.length,
          chars: details.chars,
          programs: details.refreshed,
        }),
        names.length === 0
          ? "fixtures cleared — a program that queries now answers with its own default"
          : `served: ${names.join(", ")}`,
        details.refreshed === 0
          ? ""
          : counted(details.refreshed, "program") + " re-drew",
      ),
      details,
    );
  },
};
