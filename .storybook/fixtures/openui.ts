/**
 * A program in the log, as the scenes draw it.
 *
 * The store is the app's, so a scene seeds it the way a tool call would: the
 * source, the anchor row that paints it, the values the human left and the one
 * interaction still waiting. That is what makes the PNG a picture of mu being
 * used rather than a picture of a widget.
 */

import { OPENUI_RENDER_TOOL, OPENUI_VALIDATE_TOOL } from "../../src/plugins/openui/constants";
import { detailsOf, writeProgram } from "../../src/plugins/openui/lib/programStore/verbs";
import { programStore } from "../../src/plugins/openui/lib/programStore/store";
import {
  programStatusRow,
  programTable,
  valueTable,
} from "../../src/plugins/openui/lib/format";
import { statusTable, blocks } from "../../src/plugins/core/lib/agent/toolText";
import { toolCallFixture, type ToolFixture } from "./tool";

/** The screen the agent drew: a change to split, with the filter the human used. */
export const OPENUI_PROGRAM = [
  "root = Screen([head, pane, foot])",
  '$show = "All"',
  "$count = 2",
  'head = Header("Split this change", "four files moved; the two test files belong in a commit of their own", [Badge("jj", "info"), Badge("4 files")])',
  'all = [{name: "src/plugins/vcs/lib/ops.ts", lines: 164}, {name: "src/plugins/vcs/lib/answer.ts", lines: 44}, {name: "src/plugins/vcs/tools/vcsSplit.test.ts", lines: 80}, {name: "src/plugins/vcs/lib/params.test.ts", lines: 22}]',
  'shown = $show == "All" ? all : @Filter(all, "lines", ">=", 50)',
  'pane = Pane("The files this change moved", [Choice($show, ["All", "Only the big ones"], "Filter"), Table(["file", "lines"], @Each(shown, "f", [f.name, f.lines])), Row([Stepper($count, 1, 4, "commits to cut"), Spacer(), Button("Split it", @ToAssistant("split this change for me"))], 2)])',
  'foot = StatusLine([Caption(@Count(shown) + " files shown"), KeyValue("cut into", $count + " commits"), Note("the split runs as a tool call you can read", "muted")])',
].join("\n");

/**
 * The same answer drawn as figures instead of cells: the change as a tree with
 * what moved in each path, the write-up as sections with their standing, the CI
 * run as stages on a bar, the run's time as spans on one axis — every one of them
 * counted by the figure at its title's right.
 */
export const FIGURES_PROGRAM = [
  "root = Screen([head, change, say, stages, time, foot])",
  'head = Header("What 0.14 changed", "the files, what the change says, and where the run spent its time", [Badge("jj", "info"), Badge("4 files")])',
  'paths = [{name: "packages", children: [{name: "core", children: [{name: "src", children: [{name: "convertMessages.ts", added: 24, removed: 6}, {name: "convertMessages.test.ts", added: 41}]}]}, {name: "ui", children: [{name: "composer.tsx", added: 8, removed: 3}, {name: "draft-slot.md", added: 5}]}]}]',
  'counts = Row([Text("+78", "sm", "success"), Text("-9", "sm", "danger")], 1)',
  'change = Pane("The files this change moved", [Tree(paths, ["packages", "packages/core", "packages/core/src", "packages/ui"])], "card", null, [counts])',
  'say = Pane("What the change says", [Sections([["What changed in 0.14", "Drafts moved from parent state into a per-thread slot owned by the composer.", "done", "4 src"], ["Who is affected", "Anyone mirroring the draft in their own useState reads a value that never updates.", "done", "3 src"], ["Migration path", "Replace the mirror with useDraft(threadId) and delete the hydrate effect.", "current", "2 src"]])], "card", null, [Caption("3/4 sections")])',
  'stages = Pane("Verify the fix on CI", [Steps([["clone", "done"], ["install", "done"], ["build", "done"], ["test", "error"]], 3, "warning", "Build passed. Tests stopped after the preview timed out.")], "card", "warning", [Caption("1m 12s")])',
  'spans = [["run", 0, 1840], ["chat.completions", 40, 720], ["web_search", 800, 460, "accent"], ["fetch page", 860, 380, null, 1], ["chat.completions", 1300, 540]]',
  'time = Pane("Where the run spent its time", [Trace(spans, 1840)], "card", null, [Caption("1840 ms")])',
  'foot = StatusLine([Caption("4 files · 3 sections · 4 stages"), Note("the marks are the log’s own", "muted")])',
].join("\n");

export const OPENUI_RENDER_ID = "call-ui-render";
export const FIGURES_RENDER_ID = "call-figures-render";

/** Put the program in the store, as `openui-render` would have. */
export function seedOpenUIScreen(): void {
  if (programStore.has("screen")) return;
  const write = writeProgram("screen", OPENUI_PROGRAM, OPENUI_RENDER_ID, {});
  if (write.error !== "") throw new Error(`the scene's program did not parse: ${write.error}`);
  // What the human did to it before the screenshot.
  programStore.setValue("screen", "$count", 3);
  programStore.pushEvent("screen", {
    at: Date.now(),
    type: "click",
    message: "Split it",
    params: {},
  });
}

/** Put the figures screen in the store, as its own render call would have. */
export function seedFiguresScreen(): void {
  if (programStore.has("figures")) return;
  const write = writeProgram("figures", FIGURES_PROGRAM, FIGURES_RENDER_ID, {});
  if (write.error !== "")
    throw new Error(`the scene's program did not parse: ${write.error}`);
}

const seeded = (() => {
  seedOpenUIScreen();
  const record = programStore.get("screen");
  if (record === undefined) throw new Error("the scene's program is missing");
  return record;
})();

const RENDER_DETAILS = detailsOf(seeded, {
  streaming: false,
  chunkChars: OPENUI_PROGRAM.length,
});

/** The read the agent made before it wrote a line of the language. */
export const OPENUI_PROMPT_ITEM: ToolFixture = toolCallFixture(
  "call-ui-prompt",
  "openui-prompt",
  {},
  "ok",
  blocks(
    statusTable({ root: "Screen", components: 35, groups: 7, chars: 19_812 }),
    "35 components in 7 groups",
  ),
  {
    details: {
      status: "ok",
      error: "",
      chars: 19_812,
      root: "Screen",
      components: 35,
      groups: [
        "Screen",
        "Layout",
        "Text",
        "Data",
        "Figures",
        "Status",
        "Inputs",
      ],
      tools: [],
      examples: 2,
      editMode: false,
    },
  },
);

/** The check it ran on the source before committing it to the log. */
export const OPENUI_VALIDATE_ITEM: ToolFixture = toolCallFixture(
  "call-ui-validate",
  OPENUI_VALIDATE_TOOL,
  {},
  "ok",
  blocks(statusTable({ chars: OPENUI_PROGRAM.length, statements: 8, ok: "yes", errors: 0, unresolved: 0 })),
  {
    details: {
      status: "ok",
      error: "",
      ok: true,
      name: "",
      chars: OPENUI_PROGRAM.length,
      statements: 8,
      components: ["Screen", "Header", "Badge", "Pane", "Choice", "Table", "Stepper", "Button"],
      unresolved: [],
      orphaned: [],
      incomplete: false,
      diagnostics: [],
      queries: [],
      values: [
        { name: "$show", value: "All" },
        { name: "$count", value: "2" },
      ],
    },
  },
);

/** The render itself — and the row that draws the screen. */
export const OPENUI_RENDER_ITEM: ToolFixture = toolCallFixture(
  OPENUI_RENDER_ID,
  OPENUI_RENDER_TOOL,
  { name: "screen", code: OPENUI_PROGRAM },
  "ok",
  blocks(
    statusTable({ program: "screen", chars: OPENUI_PROGRAM.length, statements: 8, ok: "yes" }),
    `program screen · ${String(OPENUI_PROGRAM.length)} chars · 8 statements · 14 components`,
  ),
  { details: RENDER_DETAILS },
);

/**
 * The render that drew the figures screen — the row that paints it.
 *
 * A function, not a value: the scene seeds the store when it is built, so the
 * other scenes never show a program they never rendered.
 */
export function figuresRenderItem(): ToolFixture {
  seedFiguresScreen();
  const record = programStore.get("figures");
  if (record === undefined)
    throw new Error("the scene's figures program is missing");
  return toolCallFixture(
    FIGURES_RENDER_ID,
    OPENUI_RENDER_TOOL,
    { name: "figures", code: FIGURES_PROGRAM },
    "ok",
    blocks(
      statusTable({
        program: "figures",
        chars: FIGURES_PROGRAM.length,
        statements: 10,
        ok: "yes",
      }),
      programStatusRow(programStore.infoOf(record)),
    ),
    { details: detailsOf(record, { streaming: false, chunkChars: FIGURES_PROGRAM.length }) },
  );
}

/** What the agent read back after the screen had been used. */
export const OPENUI_STATE_ITEM: ToolFixture = toolCallFixture(
  "call-ui-state",
  "openui-state",
  {},
  "ok",
  blocks(
    statusTable({ program: "screen", statements: 8, drawn: 14, errors: 0, interactions: 1, showing: "yes" }),
    valueTable([
      { name: "$show", value: "All" },
      { name: "$count", value: "3" },
    ]),
  ),
  {
    details: {
      status: "ok",
      error: "",
      name: "screen",
      source: OPENUI_PROGRAM,
      truncated: false,
      streaming: false,
      live: true,
      drawn: ["Screen", "Header", "Badge", "Pane", "Choice", "Table", "Stepper", "Button", "StatusLine"],
      unresolved: [],
      errors: [],
      values: [
        { name: "$show", value: "All" },
        { name: "$count", value: "3" },
      ],
      waiting: 1,
      queries: [],
      failures: [],
      statements: 8,
    },
  },
);

/** The programs that were in the log when the scene was taken. */
export const OPENUI_LIST_ITEM: ToolFixture = toolCallFixture(
  "call-ui-list",
  "openui-list",
  {},
  "ok",
  blocks(statusTable({ programs: 1, showing: "screen" }), programTable([programStore.infoOf(seeded)])),
  {
    details: {
      status: "ok",
      error: "",
      programs: [programStore.infoOf(seeded)],
      count: 1,
      showing: "screen",
    },
  },
);

export const OPENUI_ANSWER =
  "The screen holds the split: the filter is a `$variable`, so picking \"Only the big ones\" hides the small files without another message, and the stepper is on 3 commits. Pressing **Split it** queued one interaction — I have it, and the split runs as `vcs-file-split`.";
