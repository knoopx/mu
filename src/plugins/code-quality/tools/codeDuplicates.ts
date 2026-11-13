import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { CODE_DUPLICATES_TOOL, DEFAULT_FINDING_LIMIT } from "../constants";
import { fallowDupes } from "../lib/fallow";
import {
  blocks,
  counted,
  moreLine,
  scopeLabel,
  statusTable,
  tableOf,
  toolResult,
} from "../../core/lib/agent/toolText";
import { answerUnlessOk } from "../lib/answer";
import { limitParam } from "../lib/params";
import type { CodeDuplicatesDetails, CodeDuplicatesParams } from "../types";

const Parameters = Type.Object({
  path: Type.Optional(
    Type.String({
      description:
        "Project directory to scan (default: the working directory).",
    }),
  ),
  limit: limitParam("clone groups to return, longest first"),
});

async function executeCodeDuplicates(
  params: CodeDuplicatesParams,
): Promise<AgentToolResult<CodeDuplicatesDetails>> {
  const details = await fallowDupes(
    params.path,
    params.limit ?? DEFAULT_FINDING_LIMIT,
  );

  const percent =
    details.duplication_percentage === 0
      ? "0%"
      : `${details.duplication_percentage.toFixed(2)}%`;

  const head = statusTable({
    scope: scopeLabel(details.path),
    files: details.total_files,
    duplicated_lines: `${String(details.duplicated_lines)} of ${String(
      details.total_lines,
    )}`,
    duplication: percent,
    status: details.status,
  });

  const nothing = answerUnlessOk(head, details, "no clone groups found");
  if (nothing !== null) return nothing;

  const groups = details.rows.map((row) =>
    [
      tableOf([
        {
          fingerprint: row.fingerprint,
          lines: row.lines,
          tokens: row.tokens,
          instances: row.instances.length,
          spread: row.spread,
        },
      ]),
      row.instances
        .map(
          (instance) =>
            `  ${instance.file}:${String(instance.from)}-${String(instance.to)}`,
        )
        .join("\n"),
    ].join("\n"),
  );

  return toolResult(
    blocks(
      head,
      groups.join("\n\n"),
      moreLine(details.omitted, "clone group"),
      `${counted(
        details.clone_groups,
        "group",
      )} across ${String(details.clone_instances)} instances — ${percent} of the project's ${String(
        details.total_lines,
      )} lines are duplicated.`,
    ),
    details,
  );
}

export const codeDuplicatesTool: ToolDefinition<
  typeof Parameters,
  CodeDuplicatesDetails
> = {
  name: CODE_DUPLICATES_TOOL,
  label: "Duplicate code",
  description:
    "Compares a project directory against itself and answers with one row per clone " +
    "group — its fingerprint, line and token counts, spread, and the file and line range of " +
    "every instance — with the project's duplication percentage above them. Use it to find " +
    "copy-pasted logic worth extracting into one shared function. Read-only: nothing is edited.",
  promptSnippet: "Find copy-pasted code blocks and every place each clone sits",
  promptGuidelines: [
    "Check code-duplicates before writing a second near-identical block — never reach for a shell command instead of it.",
    "Read the instance ranges before extracting: two clones in one file are a helper, clones spread across features may be two jobs.",
    "Extract once, then re-run the call; the percentage, not the row count, is what should move.",
  ],

  executionMode: "parallel",
  parameters: Parameters,

  async execute(_toolCallId, params) {
    return executeCodeDuplicates(params);
  },
};
