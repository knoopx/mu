import type { JSX } from "react";
import {
  Tool,
  ToolContent,
  ToolHeader,
  useAdwaita,
  type AdwaitaTheme,
  type ToolState,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { Markdown } from "./Markdown";
import { PatchDiff } from "./PatchDiff";
import { StateSpinner } from "./StateSpinner";
import {
  ReadPreview,
  isReadTool,
  readPreviewOf,
  type ReadPreviewData,
} from "./ReadPreview";
import {
  WritePreview,
  isWriteTool,
  writePreviewOf,
  type WritePreviewData,
} from "./WritePreview";
import { useProjectSource, type ProjectSource } from "./ProjectSource";
import {
  outputModeFor,
  plainOutputOf,
  type OutputMode,
} from "../lib/ui/toolOutputMode";
import { commandTextOf, pathTextOf } from "../lib/agent/toolInput";
import { toolIconOf } from "../lib/ui/toolIcon";
import { PAGE_INSET, outputPanel } from "../lib/ui/transcriptLayout";
import { buildNativeTheme } from "../lib/ui/theme";
import {
  askDetailsOf,
  isAskTool,
  AskResultRows,
} from "../../interaction/components/AskResultRows";
import type { AskQuestion } from "../../interaction/types";
import {
  isSearchTool,
  searchPreviewOf,
  SearchResults,
} from "../../web-search/components/SearchResults";
import {
  GithubToolRows,
  isGithubTool,
} from "../../github/components/GithubToolRows";
import {
  GuardrailBlockRows,
  guardrailBlockOf,
} from "../../guardrails/components/GuardrailBlockRows";
import {
  GuardrailsToolRows,
  guardrailsToolPreview,
  isGuardrailsTool,
} from "../../guardrails/components/GuardrailsToolRows";
import {
  isVcsTool,
  vcsToolPreviewOf,
  VcsToolRows,
} from "../../vcs/components/VcsToolRows";
import {
  isCodeQualityTool,
  QualityToolRows,
  qualityToolPreviewOf,
} from "../../code-quality/components/QualityToolRows";
import {
  isOpenUITool,
  openUIToolPreviewOf,
  OpenUIToolRows,
} from "../../openui/components/OpenUIToolRows";
import {
  isMermaidTool,
  MermaidToolRows,
  mermaidToolPreviewOf,
} from "../../mermaid/components/MermaidToolRows";
import {
  ChartToolRows,
  chartToolPreviewOf,
  isChartTool,
} from "../../figures/components/ChartToolRows";
import {
  isTreeTool,
  TreeToolRows,
  treeToolPreviewOf,
} from "../../figures/components/TreeToolRows";
import {
  isTableTool,
  TableToolRows,
  tableToolPreviewOf,
} from "../../figures/components/TableToolRows";
import {
  isPlanTool,
  PlanToolRows,
  planToolPreviewOf,
} from "../../planning/components/PlanToolRows";
import { CodemodeToolRows, isCodemodeTool } from "./CodemodeToolRows";
import { codemodePreviewOf } from "../lib/codemode/script";

import type { ToolTranscriptItem } from "../lib/agent/transcriptState";

export interface ToolExecutionProps {
  item: ToolTranscriptItem;
  style?: Partial<StyleDesc>;
}

const PREVIEW_MAX = 72;

const DIFF_TOOLS = new Set(["edit"]);

function snippet(value: string): string {
  const normalized = value.split(/\s+/).filter(Boolean).join(" ");
  if (normalized.length <= PREVIEW_MAX) return normalized;
  return `${normalized.slice(0, PREVIEW_MAX)}…`;
}

function formatArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([key, value]) => `${key}=${JSON.stringify(value) ?? String(value)}`)
    .join(" ");
}

/**
 * The header line of a call the log has no view of its own for: what it was
 * pointed at. A command shows the command and a file call shows the path — both
 * read from the call's shape, because a table of tool names here is a list that
 * only ever goes stale.
 */
function previewFor(item: ToolTranscriptItem): string {
  const args = item.args ?? {};

  const command = commandTextOf(args);
  if (command !== "") return snippet(command);

  const path = pathTextOf(args);
  if (path !== "") return snippet(path);

  return snippet(formatArgs(args));
}

function askQuestionsOf(item: ToolTranscriptItem): Partial<AskQuestion>[] {
  const questions = item.args?.questions;
  if (!Array.isArray(questions)) return [];
  return questions.filter(
    (question): question is Partial<AskQuestion> =>
      typeof question === "object" && question !== null,
  );
}

function askPreview(item: ToolTranscriptItem): string {
  const questions = askQuestionsOf(item);
  const label = `${questions.length} ${questions.length === 1 ? "question" : "questions"}`;

  const answers = askDetailsOf(item)?.answers ?? [];
  if (answers.length > 0) return `${label} · answered ${answers.length}`;

  const text = questions.length === 1 ? questions[0].question : undefined;
  if (typeof text === "string" && text.trim() !== "")
    return `${label} · ${snippet(text.trim())}`;

  return label;
}

function patchOf(item: ToolTranscriptItem): string | undefined {
  const details = item.details as { patch?: unknown } | undefined;
  if (details === undefined || details === null) return undefined;
  const patch = details.patch;
  if (typeof patch !== "string") return undefined;
  return patch.trim() === "" ? undefined : patch;
}

function toToolState(item: ToolTranscriptItem): ToolState {
  switch (item.status) {
    case "running":
      return "running";
    case "error":
      return "output-error";
    default:
      return "output-available";
  }
}

function ownsItsRows(item: ToolTranscriptItem): boolean {
  return (
    isAskTool(item.name) ||
    isSearchTool(item.name) ||
    isGithubTool(item.name) ||
    isGuardrailsTool(item.name) ||
    isVcsTool(item.name) ||
    isCodeQualityTool(item.name) ||
    isCodemodeTool(item.name) ||
    isOpenUITool(item.name) ||
    isMermaidTool(item.name) ||
    isChartTool(item.name) ||
    isTreeTool(item.name) ||
    isTableTool(item.name) ||
    isPlanTool(item.name) ||
    guardrailBlockOf(item) !== null
  );
}

interface ToolRowLook {
  state: ToolState;
  args: string;
  outputMode: OutputMode;
  readPreview?: ReadPreviewData;
  writePreview?: WritePreviewData;
  patch?: string;
  showOutput: boolean;
}

function argsLineOf(
  item: ToolTranscriptItem,
  readPreview: ReadPreviewData | undefined,
): string {
  if (isAskTool(item.name)) return askPreview(item);
  if (isSearchTool(item.name)) return searchPreviewOf(item);
  if (isGuardrailsTool(item.name)) return guardrailsToolPreview(item);
  if (isVcsTool(item.name)) return vcsToolPreviewOf(item);
  if (isCodeQualityTool(item.name)) return qualityToolPreviewOf(item);
  if (isOpenUITool(item.name)) return openUIToolPreviewOf(item);
  if (isMermaidTool(item.name)) return mermaidToolPreviewOf(item);
  if (isChartTool(item.name)) return chartToolPreviewOf(item);
  if (isTreeTool(item.name)) return treeToolPreviewOf(item);
  if (isTableTool(item.name)) return tableToolPreviewOf(item);
  if (isPlanTool(item.name)) return planToolPreviewOf(item);
  if (isCodemodeTool(item.name)) return codemodePreviewOf(item);
  if (readPreview !== undefined) return readPreview.caption;
  return previewFor(item);
}

function toolRowLookOf(
  item: ToolTranscriptItem,
  source: ProjectSource,
): ToolRowLook {
  const state = toToolState(item);
  const readPreview = isReadTool(item.name)
    ? readPreviewOf(item, source)
    : undefined;
  const writePreview = isWriteTool(item.name)
    ? writePreviewOf(item)
    : undefined;
  const patch = DIFF_TOOLS.has(item.name.toLowerCase())
    ? patchOf(item)
    : undefined;
  const isWrite = isWriteTool(item.name);
  return {
    state,
    args: argsLineOf(item, readPreview),
    outputMode: outputModeFor(item),
    ...(readPreview === undefined ? {} : { readPreview }),
    ...(writePreview === undefined ? {} : { writePreview }),
    ...(patch === undefined ? {} : { patch }),
    showOutput:
      item.output.length > 0 &&
      !ownsItsRows(item) &&
      readPreview === undefined &&
      patch === undefined &&
      !(isWrite && state !== "output-error"),
  };
}

/**
 * A tool whose plugin draws its whole row — tool chrome and all.
 *
 * A GitHub read is a record, a list and a body of prose. Wrapped in the shared tool
 * box it looks like every other tool's answer, which is what it is not: so the
 * plugin owns the row — the identity band, the counts, the widget that thing has —
 * and core supplies only the page it stands on and the guardrail block that outranks
 * any card.
 */
export function dedicatedToolRowOf(
  item: ToolTranscriptItem,
): JSX.Element | null {
  if (!isGithubTool(item.name)) return null;
  const block = guardrailBlockOf(item);
  return (
    <>
      <GithubToolRows item={item} />
      {block === null ? null : (
        <ToolContent open>
          <GuardrailBlockRows hit={block} />
        </ToolContent>
      )}
    </>
  );
}

function ownedPanelsOf(item: ToolTranscriptItem): JSX.Element[] {
  const panels: JSX.Element[] = [];
  const block = guardrailBlockOf(item);
  if (isAskTool(item.name))
    panels.push(
      <ToolContent key="ask" open>
        <AskResultRows item={item} />
      </ToolContent>,
    );
  if (isSearchTool(item.name))
    panels.push(
      <ToolContent key="search" open>
        <SearchResults item={item} />
      </ToolContent>,
    );
  if (block !== null)
    panels.push(
      <ToolContent key="block" open>
        <GuardrailBlockRows hit={block} />
      </ToolContent>,
    );
  if (isGuardrailsTool(item.name))
    panels.push(
      <ToolContent key="guardrails" open>
        <GuardrailsToolRows item={item} />
      </ToolContent>,
    );
  if (isVcsTool(item.name))
    panels.push(
      <ToolContent key="vcs" open>
        <VcsToolRows item={item} />
      </ToolContent>,
    );
  if (isCodeQualityTool(item.name))
    panels.push(
      <ToolContent key="code-quality" open>
        <QualityToolRows item={item} />
      </ToolContent>,
    );
  // The script's own rows, its printed output and its timing: pi answers with a
  // header plus text and records the nested calls in details, and none of that
  // is a table the shared output panel could draw.
  // A program is not a table of findings: the row of a render or a stream is
  // the screen itself, painted live from the program store.
  if (isOpenUITool(item.name))
    panels.push(
      <ToolContent key="openui" open>
        <OpenUIToolRows item={item} />
      </ToolContent>,
    );
  if (isCodemodeTool(item.name))
    panels.push(
      <ToolContent key="codemode" open>
        <CodemodeToolRows item={item} />
      </ToolContent>,
    );
  // A diagram is not a table of findings: the row's body is the picture, drawn
  // from the markup the call left in its details.
  if (isMermaidTool(item.name))
    panels.push(
      <ToolContent key="mermaid" open>
        <MermaidToolRows item={item} />
      </ToolContent>,
    );
  // A plot is not a table of findings either: the row's body is the picture,
  // drawn from the points the call left in its details, in the theme the window
  // is wearing — which is why the data travels and a bitmap never does. A tree
  // and a table are the same kind of call: their body is the widget, drawn from
  // the shape in the details, so a resumed session still draws it.
  if (isChartTool(item.name))
    panels.push(
      <ToolContent key="figures" open>
        <ChartToolRows item={item} />
      </ToolContent>,
    );
  if (isTreeTool(item.name))
    panels.push(
      <ToolContent key="tree" open>
        <TreeToolRows item={item} />
      </ToolContent>,
    );
  if (isTableTool(item.name))
    panels.push(
      <ToolContent key="table" open>
        <TableToolRows item={item} />
      </ToolContent>,
    );
  // A plan is not a table of findings either: its rows are the list itself, each
  // step in the colour of where it stands, drawn from the steps the call left in
  // its details — which is why a session resumed next week still shows the plan
  // it ended with.
  if (isPlanTool(item.name))
    panels.push(
      <ToolContent key="plan" open>
        <PlanToolRows item={item} />
      </ToolContent>,
    );
  return panels;
}

function ToolOutputBody(props: {
  item: ToolTranscriptItem;
  state: ToolState;
  outputMode: OutputMode;
  theme: AdwaitaTheme;
}): JSX.Element {
  const { item, state, outputMode, theme } = props;
  if (state === "output-error")
    return <ToolContent open errorText={plainOutputOf(item.output)} />;
  if (outputMode === "code")
    return <ToolContent open output={plainOutputOf(item.output)} />;
  return (
    <ToolContent open>
      <div style={outputPanel(theme)}>
        <Markdown
          source={item.output}
          theme={buildNativeTheme(theme)}
          style={{ padding: 0, flexShrink: 1, minWidth: 0 }}
        />
      </div>
    </ToolContent>
  );
}

export function ToolExecution(props: ToolExecutionProps): JSX.Element {
  const source = useProjectSource();
  const theme = useAdwaita();
  const { item } = props;
  const look = toolRowLookOf(item, source);

  return (
    <Tool
      open
      style={{
        width: "100%",
        minWidth: 0,
        flexShrink: 1,
        paddingLeft: PAGE_INSET,
        paddingRight: PAGE_INSET,
        ...props.style,
      }}
    >
      <ToolHeader
        state={look.state}
        title={item.name}
        args={look.args}
        icon={toolIconOf(item.name)}
        spinnerSlot={<StateSpinner />}
      />
      {ownedPanelsOf(item)}
      {look.readPreview !== undefined ? (
        <ReadPreview item={item} preview={look.readPreview} />
      ) : null}
      {look.writePreview !== undefined ? (
        <WritePreview preview={look.writePreview} />
      ) : null}
      {look.patch !== undefined ? <PatchDiff patch={look.patch} /> : null}
      {look.showOutput ? (
        <ToolOutputBody
          item={item}
          state={look.state}
          outputMode={look.outputMode}
          theme={theme}
        />
      ) : null}
    </Tool>
  );
}
