/**
 * What the model is taught before it writes a program.
 *
 * `openui-prompt` answers with this text, so the rules below are the whole of
 * what mu asks of a screen: the shape of a GNOME screen, the spacing tiers the
 * app owns, and the worked examples a program is written in the style of. The
 * syntax and the component signatures come from the library itself — this file
 * only says what the library cannot state about itself.
 */

import { generateSystemPrompt } from "@openuidev/lang-core";

import { librarySpec } from "../schema/library";

/** The two worked examples, in this library's own components. */
export const EXAMPLE_PROGRAMS: string[] = [
  `Example 1: a change the agent is asked to split — one operated list, and a filter that works without another message:

root = Screen([head, pane, foot])
$show = "All"
$files = []
head = Header("Split this change", "Four files moved; the two test files belong in their own commit.", [Badge("jj", "info"), Badge("4 files")])
all = [{name: "src/lib/ops.ts", lines: 120}, {name: "src/lib/answer.ts", lines: 44}, {name: "test/ops.test.ts", lines: 80}, {name: "test/answer.test.ts", lines: 22}]
picked = @Filter(all, "name", "!=", "")
shown = $show == "All" ? all : @Filter(all, "lines", ">=", 50)
pane = Pane("The files this change moved", [Choice($show, ["All", "Only the big ones"], "Filter"), Table(["file", "lines"], @Each(shown, "f", [f.name, f.lines])), Row([Stepper(@Count($files), 0, 4, "picked aside"), Spacer(), Button("Split the change", @ToAssistant("Split this change for me"))], 2)])
foot = StatusLine([Caption(@Count(shown) + " files shown"), Caption(@Count(picked) + " named"), Note("the split runs as a tool call you can read", "muted")])`,
  `Example 2: a screen over Query data, with a slider that filters it on the spot:

root = Screen([head, summary, pane, foot])
$max = 40
head = Header("Orders, last 90 days", "Served from the names openui-tools gave the program.", [Badge("Query", "info")])
orders = Query("get_orders", { days: 90 }, { rows: [] })
rows = @Filter(orders.rows, "total", "<=", $max)
summary = Row([Stat("Orders", @Count(orders.rows), null, "accent", "lg"), Stat("Under limit", @Count(rows), null, "success", "lg"), Stat("Average", @Avg(@Each(rows, "r", r.total)), "+3 vs last month", "muted", "lg")], 4)
pane = Pane("Rows", [Slider($max, 0, 200, 5, "Show orders up to"), Table(["product", "total"], @Each(rows, "r", [r.product, r.total])), Button("Ask for a chart", @ToAssistant("Chart these orders by week"))])
foot = StatusLine([Caption(@Count(rows) + " of " + @Count(orders.rows) + " rows"), Note("nothing is sent until you press the button", "muted")])`,
];

/** What mu asks of every screen, in the words the model has to follow. */
export const MU_SCREEN_RULES: string[] = [
  "A program is a GNOME screen, not a web page: it opens with a Header, holds one thing the human operates, and closes with a StatusLine that states what the screen currently holds.",
  "Do not fill a screen with cards or a strip of figures that nothing operates. One Pane per block of the screen, and a Pane never sits inside a Pane.",
  "Spacing is the app's, not the program's: leave gap unset on a Stack and a Pane, and set a number only on a Row or a Grid. gap counts 4px steps.",
  "Every input must do something: change a $variable the screen reads, or ask the agent something with @ToAssistant. A button that changes nothing is a bug.",
  "Every input leads with the $variable it holds: Choice($show, [\"All\", \"Big only\"], \"Filter\"), Slider($max, 0, 200, 5, \"up to\"), Stepper($count, 1, 4, \"commits\"), Toggle($dark, \"Dark mode\"), Field($note, \"why\").",
  "The screen works on its own. Keep what the human picks in $variables and compute what is shown from them with @Each, @Filter, @Count and @Join; @ToAssistant is only for what the page cannot compute.",
  "The agent's own rows — a file list, a diff summary, a table of findings — are a Table or a list of KeyValue rows, not a paragraph of prose.",
  "Tone words are limited to the library's list: ink, muted, faint, accent, info, success, warning, danger, surface, sunken, card. Never a colour of your own.",
  "Keep a program short: one header, two or three blocks, one status line. A screen the human can read without scrolling is the goal.",
];

export interface PromptBuild {
  preamble: string;
  tools: string[];
  examples: string[];
  editMode: boolean;
}

/** The reference the `openui-prompt` tool answers with. */
export function buildLanguagePrompt(build: PromptBuild): string {
  return generateSystemPrompt({
    library: librarySpec,
    promptOptions: {
      ...(build.preamble === "" ? {} : { preamble: build.preamble }),
      bindings: true,
      toolCalls: build.tools.length > 0,
      builtinFunctions: true,
      editMode: build.editMode,
      ...(build.tools.length === 0 ? {} : { tools: build.tools }),
      additionalRules: MU_SCREEN_RULES,
      examples: build.examples.length === 0 ? EXAMPLE_PROGRAMS : build.examples,
    },
  });
}
