import { OPENUI_RENDER_TOOL } from "../../src/plugins/openui/constants";
import { programStore } from "../../src/plugins/openui/lib/programStore";
import type { OpenuiRenderDetails } from "../../src/plugins/openui/types";
import { toolCallFixture, type ToolFixture } from "./tool";

/** The program the story renders in the log: an operable GNOME screen. */
export const OPENUI_PROGRAM = `positions = Query("positions", {}, [
  { ticker: "AAPL", summary: "240 shares · €8,412 · +6.1%", kind: "Stock" },
  { ticker: "NVDA", summary: "60 shares · €3,102 · -1.4%", kind: "Stock" },
  { ticker: "SPY", summary: "index fund · €18,900 · +0.8%", kind: "Fund" }
])
shown = @Filter(positions, "ticker", "contains", $filter)
root = Stack([
  HeaderBar("Positions", "portfolio · 3 holdings", [ViewSwitcher([{ value: "positions", label: "Positions", icon: "list" }, { value: "allocation", label: "Allocation", icon: "pieChart" }], "view", $view)], [Button("Refresh", "ghost", "default")]),
  BoxedList([
    ComboRow("sort", "Sort by", $sort, [{ value: "value", label: "Value" }, { value: "ticker", label: "Ticker" }]),
    SwitchRow("hideZero", "Hide zero positions", "rows without a value drop out", $hideZero),
    EntryRow("filter", "Filter", $filter, "ticker contains…")
  ]),
  RowList(@Each(shown, "r", ActionRow(r.ticker, r.summary, "queryStats", "", false, false, @ToAssistant("Ask about this position", { ticker: r.ticker })))),
  Metric("Portfolio", "€30,414", "+4.2% this week", "success"),
  StatusBar("3 positions · €30,414 shown", 0.62, [], [{ desc: "filter", kbds: ["ctrl", "k"] }])
])
`;

export const OPENUI_PROGRAM_NAME = "positions";

export const OPENUI_RENDER_ID = "tool-openui-render";

/** The rows the program draws its list from — what `openui-tools` served it. */
export const OPENUI_POSITIONS = [
  { ticker: "AAPL", summary: "240 shares · €8,412 · +6.1%", kind: "Stock" },
  { ticker: "NVDA", summary: "60 shares · €3,102 · -1.4%", kind: "Stock" },
  { ticker: "SPY", summary: "index fund · €18,900 · +0.8%", kind: "Fund" },
];

const RENDER_DETAILS: OpenuiRenderDetails = {
  program: OPENUI_PROGRAM_NAME,
  status: "ok",
  ok: true,
  streaming: false,
  incomplete: false,
  statements: 3,
  components: [
    "Stack",
    "Query",
    "Filter",
    "Each",
    "HeaderBar",
    "ViewSwitcher",
    "Button",
    "BoxedList",
    "ComboRow",
    "SwitchRow",
    "EntryRow",
    "RowList",
    "ActionRow",
    "Metric",
    "StatusBar",
  ],
  unresolved: [],
  errors: [],
  chars: OPENUI_PROGRAM.length,
  active: OPENUI_PROGRAM_NAME,
  programs: [OPENUI_PROGRAM_NAME],
  receivedChars: OPENUI_PROGRAM.length,
};

export const OPENUI_RENDER_ITEM: ToolFixture = toolCallFixture(
  OPENUI_RENDER_ID,
  OPENUI_RENDER_TOOL,
  { name: OPENUI_PROGRAM_NAME, code: OPENUI_PROGRAM },
  "ok",
  "",
  { details: RENDER_DETAILS },
);

/**
 * Put the program in the log the way a render call would, so the story
 * paints the live screen the human is looking at and can operate.
 */
export function putProgramInLog(): void {
  programStore.reset();
  programStore.setFixtures({ positions: OPENUI_POSITIONS });
  programStore.upsert(OPENUI_PROGRAM_NAME, {
    lang: OPENUI_PROGRAM,
    streaming: false,
    activate: true,
    owner: OPENUI_RENDER_ID,
  });
}
