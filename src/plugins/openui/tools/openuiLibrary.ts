/**
 * `openui-library` — the component index, or one component's exact props.
 *
 * A guessed component name is a hard parse error, so this is the call that
 * settles it: what the app can draw, in which group, with which arguments in
 * which positional order.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import {
  DEFAULT_LIBRARY_LIMIT,
  MAX_LIBRARY_LIMIT,
  OPENUI_LIBRARY_TOOL,
} from "../constants";
import type { PluginTool } from "../../core/lib/plugin/manifest";
import type { OpenUILibraryDetails } from "../types";
import {
  blocks,
  counted,
  moreLine,
  statusTable,
  toolResult,
} from "../../core/lib/agent/toolText";
import { limitParam } from "../lib/params";
import { componentLines, groupLines, libraryTable } from "../lib/format";
import {
  componentCount,
  componentIndex,
  componentInfo,
  libraryGroups,
  rootComponent,
} from "../lib/schema/library";
import { LIBRARY_GUIDELINES } from "./guidelines";

const LibraryParametersSchema = Type.Object({
  name: Type.Optional(
    Type.String({
      maxLength: 48,
      description:
        'Component to read, e.g. "Table" — omit for the whole component index (default "screen").',
    }),
  ),
  limit: limitParam("component"),
});

export const openUILibraryTool: PluginTool<
  typeof LibraryParametersSchema,
  OpenUILibraryDetails
> = {
  name: OPENUI_LIBRARY_TOOL,
  icon: "category",
  label: OPENUI_LIBRARY_TOOL,
  description:
    "Inspect the component library this app renders. Without `name`: the component index (name, description, group), the root component and the counts. " +
    "With `name`: that component's JSON Schema, its props as one row each with the type it takes and whether it is required, and the rules its group is taught by. Read this before and while authoring — a guessed component name is a hard parse error.",
  promptSnippet:
    "Read the component index, or one component's exact props and JSON Schema",
  promptGuidelines: [...LIBRARY_GUIDELINES],

  executionMode: "parallel",
  parameters: LibraryParametersSchema,

  async execute(
    _toolCallId,
    params,
  ): Promise<AgentToolResult<OpenUILibraryDetails>> {
    const all = componentIndex();
    const groups = libraryGroups();
    const wanted = params.name ?? "";

    if (wanted !== "") {
      const component = componentInfo(wanted);
      if (component === null) {
        const details: OpenUILibraryDetails = {
          status: "unknown",
          error: `the library has no component named "${wanted}"`,
          name: wanted,
          root: rootComponent,
          count: all.length,
          omitted: 0,
          groups,
          components: [],
        };
        return toolResult(
          blocks(
            "no component by that name",
            details.error,
            `the library holds ${counted(all.length, "component")}: ${all
              .map((entry) => entry.name)
              .join(", ")}`,
          ),
          details,
        );
      }

      const group = groups.find((entry) => entry.name === component.group);
      const details: OpenUILibraryDetails = {
        status: "ok",
        error: "",
        name: component.name,
        root: rootComponent,
        count: 1,
        omitted: 0,
        groups: group === undefined ? [] : [group],
        components: [component],
      };

      return toolResult(
        blocks(
          statusTable({
            component: component.name,
            group: component.group,
            args: component.props.length,
          }),
          componentLines(component),
          group === undefined || group.notes.length === 0
            ? ""
            : `rules of the ${component.group} group:\n${group.notes.join("\n")}`,
        ),
        details,
      );
    }

    const limit = params.limit ?? DEFAULT_LIBRARY_LIMIT;
    const shown = all.slice(0, limit);
    const details: OpenUILibraryDetails = {
      status: all.length === 0 ? "empty" : "ok",
      error: "",
      name: "",
      root: rootComponent,
      count: componentCount(),
      omitted: all.length - shown.length,
      groups,
      components: shown,
    };

    return toolResult(
      blocks(
        statusTable({
          root: rootComponent,
          components: details.count,
          groups: groups.length,
        }),
        libraryTable(shown),
        groupLines(groups),
        moreLine(details.omitted, "component"),
      ),
      details,
    );
  },
};
