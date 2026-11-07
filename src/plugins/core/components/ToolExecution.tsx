import type { JSX } from "react";
import {
  Tool,
  ToolContent,
  ToolDiff,
  ToolHeader,
  useAdwaita,
  type AdwaitaTheme,
  type ToolState,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { Markdown } from "./Markdown";
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

import type { ToolTranscriptItem } from "../lib/agent/transcriptState";

export interface ToolExecutionProps {
  item: ToolTranscriptItem;
  style?: Partial<StyleDesc>;
}

const PREVIEW_MAX = 72;

const COMMAND_TOOLS = new Set(["bash", "shell", "terminal", "exec", "run"]);

const DIFF_TOOLS = new Set(["edit"]);
const COMMAND_KEYS = ["command", "cmd"];
const CODE_KEYS = ["code"];
const URL_KEYS = ["url", "uri"];
const PATH_KEYS = ["path", "file_path", "filePath", "file", "notebook_path"];
const PATTERN_KEYS = ["pattern", "regex", "query", "glob", "search"];

function pickString(
  args: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return undefined;
}

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

function previewFor(item: ToolTranscriptItem): string {
  const args = item.args ?? {};
  const name = item.name.toLowerCase();

  const isCommand = COMMAND_TOOLS.has(name);
  if (isCommand) {
    const command = pickString(args, COMMAND_KEYS);
    if (command) return snippet(command);
  }

  const code = pickString(args, CODE_KEYS);
  if (code)
    return snippet(code.split("\n").find((line) => line.trim() !== "") ?? "");

  const url = pickString(args, URL_KEYS);
  if (url) return snippet(url);

  const path = pickString(args, PATH_KEYS);
  if (path) return snippet(path);

  const pattern = pickString(args, PATTERN_KEYS);
  if (pattern) return snippet(pattern);

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

/**
 * A plugin's own rows already say what its call did, and a guardrail block
 * says why the call never ran — such a tool never also prints its output.
 */
function ownsItsRows(item: ToolTranscriptItem): boolean {
  return (
    isAskTool(item.name) ||
    isSearchTool(item.name) ||
    isGuardrailsTool(item.name) ||
    isVcsTool(item.name) ||
    guardrailBlockOf(item) !== null
  );
}

/**
 * Everything the row is drawn from, decided once: the header's argument line,
 * the previews the file tools own, the patch an edit leaves, and whether the
 * call's own output still has a place on screen.
 */
interface ToolRowLook {
  state: ToolState;
  args: string;
  outputMode: OutputMode;
  readPreview?: ReadPreviewData;
  writePreview?: WritePreviewData;
  patch?: string;
  showOutput: boolean;
}

/** The header line: a plugin says its own, a plain tool says its arguments. */
function argsLineOf(
  item: ToolTranscriptItem,
  readPreview: ReadPreviewData | undefined,
): string {
  if (isAskTool(item.name)) return askPreview(item);
  if (isSearchTool(item.name)) return searchPreviewOf(item);
  if (isGuardrailsTool(item.name)) return guardrailsToolPreview(item);
  if (isVcsTool(item.name)) return vcsToolPreviewOf(item);
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
    outputMode: outputModeFor(item.name, item.output),
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

/** The panels a plugin draws for its own call, in the order the row shows them. */
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
  return panels;
}

/** The call's output as the tool left it: an error, a block of code, or prose. */
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
      />
      {ownedPanelsOf(item)}
      {look.readPreview !== undefined ? (
        <ReadPreview item={item} preview={look.readPreview} />
      ) : null}
      {look.writePreview !== undefined ? (
        <WritePreview preview={look.writePreview} />
      ) : null}
      {look.patch !== undefined ? (
        <ToolDiff patch={look.patch} fileHeader={false} />
      ) : null}
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
