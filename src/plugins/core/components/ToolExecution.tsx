import type { JSX } from "react";
import {
  Tool,
  ToolContent,
  ToolDiff,
  ToolHeader,
  useAdwaita,
  type ToolState,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { Markdown } from "./Markdown";
import { ReadPreview, isReadTool, readPreviewOf } from "./ReadPreview";
import { useProjectSource } from "./ProjectSource";
import { outputModeFor, plainOutputOf } from "../lib/ui/toolOutputMode";
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

import type { TranscriptItem } from "../lib/agent/transcriptState";

type ToolTranscriptItem = Extract<TranscriptItem, { kind: "tool" }>;

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

export function ToolExecution(props: ToolExecutionProps): JSX.Element {
  const source = useProjectSource();
  const t = useAdwaita();
  const { item } = props;
  const state = toToolState(item);
  const isAsk = isAskTool(item.name);
  const isSearch = isSearchTool(item.name);
  const preview = previewFor(item);
  const readPreview = isReadTool(item.name)
    ? readPreviewOf(item, source)
    : undefined;
  const outputMode = outputModeFor(item.name, item.output);
  const hasOutput = item.output.length > 0;
  const patch = DIFF_TOOLS.has(item.name.toLowerCase())
    ? patchOf(item)
    : undefined;

  const args = isAsk
    ? askPreview(item)
    : isSearch
      ? searchPreviewOf(item)
      : readPreview !== undefined
        ? readPreview.caption
        : preview;

  const showOutput =
    hasOutput && readPreview === undefined && patch === undefined && !isSearch;

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
        state={state}
        title={item.name}
        args={args}
        icon={toolIconOf(item.name)}
      />
      {isAsk ? (
        <ToolContent open>
          <AskResultRows item={item} />
        </ToolContent>
      ) : null}
      {isSearch ? (
        <ToolContent open>
          <SearchResults item={item} />
        </ToolContent>
      ) : null}
      {readPreview !== undefined ? (
        <ReadPreview item={item} preview={readPreview} />
      ) : null}

      {patch !== undefined ? (
        <ToolDiff patch={patch} fileHeader={false} />
      ) : null}
      {!isAsk && showOutput ? (
        state === "output-error" ? (
          <ToolContent open errorText={plainOutputOf(item.output)} />
        ) : outputMode === "code" ? (
          <ToolContent open output={plainOutputOf(item.output)} />
        ) : (
          <ToolContent open>
            <div style={outputPanel(t)}>
              <Markdown
                source={item.output}
                theme={buildNativeTheme(t)}
                style={{ padding: 0, flexShrink: 1, minWidth: 0 }}
              />
            </div>
          </ToolContent>
        )
      ) : null}
    </Tool>
  );
}
