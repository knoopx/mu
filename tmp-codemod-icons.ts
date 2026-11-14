/** Codemod: every plugin tool carries its own log mark. */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const ICONS: Record<string, string> = {
  // vcs
  vcsLogTool: "list",
  vcsFileDiffTool: "difference",
  vcsFileHistoryTool: "history",
  vcsFileHistoryShowTool: "description",
  vcsConflictsTool: "merge",
  vcsOplogTool: "changeHistory",
  vcsDescribeTool: "article",
  vcsFileSplitTool: "verticalSplit",
  vcsHunkListTool: "layers",
  vcsHunkSplitTool: "callSplit",
  // code-quality
  codeComplexityTool: "analytics",
  codeDeadCodeTool: "sweep",
  codeDuplicatesTool: "contentCopy",
  codeReviewTool: "rateReview",
  codeSymbolInspectTool: "category",
  codeSymbolReferencesTool: "accountTree",
  // guardrails
  guardrailsTestTool: "rule",
  guardrailsFixtureUpdateTool: "ruleSettings",
  guardrailsCoverageTool: "queryStats",
  // github
  githubRepoTool: "book",
  githubFileTool: "description",
  githubTreeTool: "folderOpen",
  githubPrTool: "pullRequest",
  githubIssueTool: "circleOutline",
  githubReleaseTool: "tagOutline",
  githubCommitTool: "history",
  githubSearchTool: "search",
  githubUserTool: "accountCircleOutline",
  // others
  askUserTool: "help",
  webSearchTool: "search",
  mermaidRenderTool: "schema",
  planTool: "taskAlt",
  chartRenderTool: "barChart",
  treeRenderTool: "accountTree",
  // openui
  openUIPromptTool: "libraryBooks",
  openUILibraryTool: "category",
  openUIValidateTool: "factCheck",
  openUIRenderTool: "dashboard",
  openUIStreamTool: "stream",
  openUIStateTool: "queryStats",
  openUIEventsTool: "notifications",
  openUIToolsTool: "widgets",
  openUIListTool: "list",
  openUISwitchTool: "swapHoriz",
  openUIClearTool: "deleteSweep",
};

const files: string[] = [];
for (const plugin of readdirSync("src/plugins")) {
  const dir = `src/plugins/${plugin}/tools`;
  try {
    for (const f of readdirSync(dir)) if (f.endsWith(".ts")) files.push(`${dir}/${f}`);
  } catch {
    /* a plugin with no tools/ */
  }
}

let touched = 0;
const notes: string[] = [];

for (const path of files) {
  let text = readFileSync(path, "utf8");
  const consts = [...text.matchAll(/^export const (\w+Tool)\b/gm)].map((m) => m[1]);
  if (consts.length !== 1) {
    notes.push(`${path}: ${consts.length} tool consts (${consts.join(",")})`);
    continue;
  }
  const name = consts[0];
  const icon = ICONS[name];
  if (icon === undefined) {
    notes.push(`${path}: no icon mapped for ${name}`);
    continue;
  }

  // 1. the annotation
  const before = text;
  text = text.replace(/:\s*ToolDefinition</g, ": PluginTool<");
  if (text === before) notes.push(`${path}: no ToolDefinition annotation found`);

  // 2. the mark, beside the name the tool answers with
  if (!/\n  icon: /.test(text)) {
    text = text.replace(
      /^(export const \w+[\s\S]*?= \{\n)(  name: [^\n]*\n)/m,
      `$1$2  icon: "${icon}",\n`,
    );
  }

  // 3. imports: pi's ToolDefinition is gone, mu's carries the mark
  if (!text.includes("ToolDefinition")) {
    text = text
      .replace(
        /^import type \{\s*\n(\s*)AgentToolResult,\n\s*ToolDefinition,\n\} from "(@earendil-works\/pi-coding-agent)";$/m,
        'import type { AgentToolResult } from "$2";',
      )
      .replace(
        /^import type \{ AgentToolResult, ToolDefinition \} from "(@earendil-works\/pi-coding-agent)";$/m,
        'import type { AgentToolResult } from "$1";',
      )
      .replace(
        /^import type \{ ToolDefinition \} from "@earendil-works\/pi-coding-agent";\n/m,
        "",
      )
      .replace(/^import type \{\n(\s*)[^]*?\},\n\} from "@earendil-works\/pi-coding-agent";$/m, (m) =>
        m.replace(/\s*ToolDefinition,?\n/, "").replace(/,\s*\}/, "\n}"),
      );
  }
  if (!text.includes("PluginTool } from")) {
    const importLine = /^import .*from "\.\.\//m;
    const at = text.search(importLine);
    const line = 'import type { PluginTool } from "../../core/lib/plugin/manifest";\n';
    text =
      at < 0
        ? `${text.replace(/\n\n/, `\n${line}\n`)}`
        : `${text.slice(0, at)}${line}${text.slice(at)}`;
  }

  writeFileSync(path, text);
  touched += 1;
}

console.log(`touched ${touched} of ${files.length} tool files`);
for (const n of notes) console.log("note:", n);
