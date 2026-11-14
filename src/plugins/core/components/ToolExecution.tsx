import type { JSX } from "react";
import {
  OutputBox,
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
  readPreviewOf,
  type ReadPreviewData,
} from "./ReadPreview";
import {
  WritePreview,
  writePreviewOf,
  type WritePreviewData,
} from "./WritePreview";
import {
  isReadTool,
  isWriteTool,
  patchOfCall,
} from "../lib/agent/builtInTools";
import { useProjectSource, type ProjectSource } from "./ProjectSource";
import {
  outputModeFor,
  plainOutputOf,
  type OutputMode,
} from "../lib/ui/toolOutputMode";
import { commandTextOf, pathTextOf } from "../lib/agent/toolInput";
import { PAGE_INSET } from "../lib/ui/transcriptLayout";
import { ToolBand } from "./ToolBand";
import { buildNativeTheme } from "../lib/ui/theme";
import { HOST } from "../../registry";
import {
  answerBodiesOf,
  blockBodiesOf,
  ownsItsRows,
  toolIconFor,
  toolPreviewOf,
} from "../lib/plugin/surfaces";
import { headerSnippet } from "../lib/agent/toolPreview";

import type { ToolTranscriptItem } from "../lib/agent/transcriptState";

export interface ToolExecutionProps {
  item: ToolTranscriptItem;
  style?: Partial<StyleDesc>;
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
  if (command !== "") return headerSnippet(command);

  const path = pathTextOf(args);
  if (path !== "") return headerSnippet(path);

  return headerSnippet(formatArgs(args));
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

interface ToolRowLook {
  state: ToolState;
  args: string;
  outputMode: OutputMode;
  readPreview?: ReadPreviewData;
  writePreview?: WritePreviewData;
  patch?: string;
  showOutput: boolean;
}

/**
 * The header's line: the owning plugin's own words if it has any, then what the
 * call was pointed at. The chain of tool names that used to live here is now the
 * registry's — a plugin that declares a preview gets it, and one that does not
 * falls to the shape of its arguments.
 */
function argsLineOf(
  item: ToolTranscriptItem,
  readPreview: ReadPreviewData | undefined,
): string {
  const owned = toolPreviewOf(HOST, item);
  if (owned !== null) return owned;
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
  const patch = patchOfCall(item);
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
      !ownsItsRows(HOST, item) &&
      readPreview === undefined &&
      patch === undefined &&
      !(isWrite && state !== "output-error"),
  };
}

/**
 * The bodies a call answers with, each on the plate the log owns.
 *
 * The plugin supplies the rows, the chips, the figure or the picture; core
 * supplies the band, so a tool row reads as an answer and the log stays a column
 * that changes its content per row and never its shape. `frame: "page"` is the
 * one exception a plugin can ask for — a program screen brings its own page, and
 * a band under it is a card inside a card. A guardrails block is drawn last, and
 * drawn whatever tool carried it, because the reason a call has no answer is the
 * answer.
 */
function answerPanelsOf(item: ToolTranscriptItem): JSX.Element[] {
  const panels: JSX.Element[] = answerBodiesOf(HOST, item).map(
    ({ key, frame, body }) =>
      frame === "page" ? (
        <ToolContent key={key} open>
          {body}
        </ToolContent>
      ) : (
        <ToolContent key={key} open>
          <ToolBand>{body}</ToolBand>
        </ToolContent>
      ),
  );
  for (const { key, body } of blockBodiesOf(HOST, item))
    panels.push(
      <ToolContent key={key} open>
        <ToolBand>{body}</ToolBand>
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
  // A failure keeps a plate of its own, because the tint is the message. Printed
  // text does not: it stands on the band, flattened, so a command's output is
  // inset exactly as the lines a read quoted and not a second card inside one.
  if (state === "output-error")
    return <ToolContent open errorText={plainOutputOf(item.output)} />;
  if (outputMode === "code")
    return (
      <ToolContent open>
        <ToolBand style={{ flexShrink: 1 }}>
          <OutputBox
            text={plainOutputOf(item.output)}
            padding={0}
            style={{ backgroundColor: "transparent" }}
          />
        </ToolBand>
      </ToolContent>
    );
  return (
    <ToolContent open>
      <ToolBand style={{ flexShrink: 1 }}>
        <Markdown
          source={item.output}
          theme={buildNativeTheme(theme)}
          style={{ padding: 0, flexShrink: 1, minWidth: 0 }}
        />
      </ToolBand>
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
        icon={toolIconFor(HOST, item.name)}
        spinnerSlot={<StateSpinner />}
      />
      {answerPanelsOf(item)}
      {look.readPreview !== undefined ? (
        <ReadPreview item={item} preview={look.readPreview} />
      ) : null}
      {look.writePreview !== undefined ? (
        <WritePreview preview={look.writePreview} />
      ) : null}
      {look.patch !== undefined ? (
        <ToolBand style={{ flexShrink: 0 }}>
          <PatchDiff patch={look.patch} />
        </ToolBand>
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
