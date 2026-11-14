/**
 * Draws a vcs tool call in the transcript. Each tool answers the model in
 * aligned columns and the log in structured details; this file paints the
 * details — chips for identities, rows for data, a real diff, a real file body.
 * The rows themselves are core's: this file only says which badges a vcs state
 * wears and which tool gets which extra block.
 */

import type { JSX, ReactNode } from "react";
import { useAdwaita, type IconName } from "adwaita-gpuix";

import {
  ToolRowList,
  ToolRunning,
  ToolStatusNote,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import { PatchDiff } from "../../core/components/PatchDiff";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import {
  headerLineOf,
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import { buildNativeTheme } from "../../core/lib/ui/theme";
import {
  toolCellOf,
  type ToolRowCell,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import { toolGapColumn } from "../../core/lib/ui/toolRows";
import { emphasisWeight } from "../../core/lib/ui/tokens";
import { previewLineHeight } from "../../core/lib/ui/transcriptLayout";
import {
  MAX_OUTPUT_LINES,
  plainOutputOf,
} from "../../core/lib/ui/toolOutputMode";
import {
  VCS_BADGE_VARIANTS,
  VCS_CONFLICTS_TOOL,
  VCS_DESCRIBE_TOOL,
  VCS_FILE_DIFF_TOOL,
  VCS_FILE_HISTORY_SHOW_TOOL,
  VCS_FILE_HISTORY_TOOL,
  VCS_FILE_SPLIT_TOOL,
  VCS_HUNK_LIST_TOOL,
  VCS_HUNK_SPLIT_TOOL,
  VCS_LOG_TOOL,
  VCS_OPLOG_TOOL,
  VCS_TOOL_NAMES,
} from "../constants";
import { vcsToolViewOf } from "../lib/toolView";
import type { VcsToolView } from "../types";
import { VcsSplitRows } from "./VcsSplitRows";

const RUNNING_TEXT: Record<string, string> = {
  [VCS_LOG_TOOL]: "reading the log",
  [VCS_FILE_DIFF_TOOL]: "reading the patch",
  [VCS_FILE_HISTORY_TOOL]: "reading file history",
  [VCS_FILE_HISTORY_SHOW_TOOL]: "reading the file at a revision",
  [VCS_CONFLICTS_TOOL]: "checking for conflicts",
  [VCS_OPLOG_TOOL]: "reading the operation log",
  [VCS_DESCRIBE_TOOL]: "writing the description",
  [VCS_FILE_SPLIT_TOOL]: "splitting the change by file",
  [VCS_HUNK_LIST_TOOL]: "listing the hunks",
  [VCS_HUNK_SPLIT_TOOL]: "splitting the change by hunk",
};

const EMPTY_TEXT: Record<string, string> = {
  [VCS_LOG_TOOL]: "no commits",
  [VCS_FILE_DIFF_TOOL]: "no changes",
  [VCS_FILE_HISTORY_TOOL]: "no revisions",
  [VCS_FILE_HISTORY_SHOW_TOOL]: "empty file",
  [VCS_CONFLICTS_TOOL]: "no conflicts",
  [VCS_OPLOG_TOOL]: "no operations",
  [VCS_HUNK_LIST_TOOL]: "no hunks",
  [VCS_DESCRIBE_TOOL]: "nothing written",
  [VCS_FILE_SPLIT_TOOL]: "nothing selected",
  [VCS_HUNK_SPLIT_TOOL]: "nothing selected",
};

/** The states a vcs vocabulary adds to the shared status tones and icons. */
const VCS_STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  "empty-selected": "warn",
  binary: "warn",
};

const VCS_STATUS_ICONS: Readonly<Record<string, IconName>> = {
  "empty-selected": "warning",
  binary: "warning",
};

const PATH_TOOLS: readonly string[] = [
  VCS_FILE_DIFF_TOOL,
  VCS_FILE_HISTORY_TOOL,
  VCS_FILE_HISTORY_SHOW_TOOL,
];

/** What the ten vcs tools say about themselves, in their own words. */
const VCS_WORDS: ToolPreviewVocabulary = {
  running: RUNNING_TEXT,
  runningDefault: "reading the repo",
  // The status words ride the scope (see `statusWord`), so the vocabulary hands
  // them over rather than replacing the scope with them.
  clean: [],
  empty: {},
  emptyDefault: "nothing found",
  stated: {},
};

/** True for the ten vcs tools — matched by their names, never retyped. */
export function isVcsTool(name: string): boolean {
  return VCS_TOOL_NAMES.includes(name.toLowerCase());
}

/**
 * The one line in the tool header: the scope it read (path, revset, rev, op log),
 * what came back against that scope — `no commits`, `no jj repo`, `binary file`, the
 * counts of the change it read — and nothing else. The card below is the answer: its
 * rows, its diff, its file body, plus the one reason line a call that did not answer
 * leaves behind. The card never states the scope, the status or the count again.
 */
export const vcsToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    vcsToolViewOf(item.name, item.args, item.details, item.status),
    VCS_WORDS,
    headerOf,
  );

/** What a status that is not `ok` says beside the scope. */
function statusWord(tool: string, view: VcsToolView): string {
  if (view.status === "ok") return "";
  if (view.status === "unsupported") return "no jj repo";
  if (view.status === "binary") return "binary file";
  return EMPTY_TEXT[tool] ?? "nothing found";
}

function headerOf(tool: string, view: VcsToolView): string {
  return headerLineOf(scopeOf(tool, view), [
    view.status === "ok" ? view.headline : "",
    statusWord(tool, view),
  ]);
}

/**
 * The identities the header's line has no room to say: the commit behind a rev, the
 * change id, the engine that answered. The cells the header already printed are
 * dropped here by construction, so one row never says `rev @` twice.
 */
export function vcsChipsOf(item: ToolTranscriptItem): readonly ToolRowCell[] {
  const view = vcsToolViewOf(item.name, item.args, item.details, item.status);
  if (view === null) return [];
  const said = vcsToolPreviewOf(item);
  return view.cells.filter((cell) => !said.includes(cell.value));
}

/** The request a tool was pointed at, read back from its chips. */
function scopeOf(tool: string, view: VcsToolView): string {
  if (tool === VCS_OPLOG_TOOL) return "op log";
  if (PATH_TOOLS.includes(tool)) return toolCellOf(view.cells, "path");
  if (tool === VCS_DESCRIBE_TOOL)
    return join([
      toolCellOf(view.cells, "rev"),
      toolCellOf(view.cells, "change"),
    ]);
  if (tool === VCS_FILE_SPLIT_TOOL)
    return join([
      toolCellOf(view.cells, "rev"),
      toolCellOf(view.cells, "files"),
    ]);
  return toolCellOf(view.cells, "rev");
}

function join(parts: readonly string[]): string {
  return parts.filter((part) => part !== "").join(" · ");
}

/** The rows, and the one reason line — the shape every table-shaped vcs tool shares.
 *  The count and the status word are the header's line, so the body adds no summary:
 *  a headline above the rows repeated what the row already said. A view whose answer
 *  is a body of text (the message a describe wrote) hands it in as `before`, so the
 *  answer is read first and the ids it moved are read after. */
function VcsViewBody({
  view,
  before,
  after,
}: {
  view: VcsToolView;
  before?: ReactNode;
  after?: ReactNode;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={toolGapColumn(t)}>
      {before ?? null}
      <ToolRowList rows={view.rows} variants={VCS_BADGE_VARIANTS} />
      <ToolStatusNote
        status={view.status}
        note={view.note}
        tones={VCS_STATUS_TONES}
        icons={VCS_STATUS_ICONS}
      />
      {after ?? null}
    </div>
  );
}

/**
 * The description a describe wrote, in the card rather than in the header.
 *
 * A message is the answer of that call, so it gets the width the card has and not
 * the header's one clipped line. Its lines stay its own — a subject, the blank
 * that parts it from the body, the body — and each wraps to the band instead of
 * running past it. The subject is the line a reader scans first, so it carries the
 * log's emphasis and the lines under it do not.
 */
function VcsMessageBody({ text }: { text: string }): JSX.Element | null {
  const t = useAdwaita();
  if (text.trim() === "") return null;
  const lines = text.replace(/\s+$/, "").split("\n");

  return (
    <>
      {lines.map((line, index) => (
        <ToolCaptionLine
          key={`message-${String(index)}`}
          text={line.trim()}
          color={t.color.text.primary}
          weight={index === 0 ? emphasisWeight(t) : undefined}
          flush
        />
      ))}
    </>
  );
}

/**
 * Whether the call leaves anything for the card to hold: rows, a reason, a patch,
 * a body of text. Core skips a body that answers null, and a plate around nothing
 * is a box under a header that already said the whole answer.
 */
function cardHasInk(view: VcsToolView): boolean {
  return (
    view.rows.length > 0 ||
    view.note !== "" ||
    view.patch !== "" ||
    view.content !== ""
  );
}

/**
 * A file's body at a revision, as monospace code bounded by a line budget.
 *
 * It is quoted bare: the whole answer already stands on the log's band, and a
 * plate inside a band is a card inside a card.
 */
function VcsFileBody({
  path,
  content,
}: {
  path: string;
  content: string;
}): JSX.Element | null {
  const t = useAdwaita();
  if (content.trim() === "") return null;
  const lineHeight = previewLineHeight(t);

  return (
    <code
      code={plainOutputOf(content)}
      path={path}
      theme={buildNativeTheme(t)}
      style={{
        maxHeight: MAX_OUTPUT_LINES * lineHeight,
        overflow: "hidden",
        flexShrink: 0,
        fontSize: t.type.caption,
        lineHeight,
        fontFamily: t.type.fontFamilyMono,
        color: t.color.text.primary,
      }}
    />
  );
}

/** The tool item to render, exactly as the transcript holds it. */
export interface VcsToolRowsProps {
  item: ToolTranscriptItem;
}

/**
 * The result of a vcs call: a running block while it works; a state line when
 * it failed, found no repo, selected nothing or found nothing; the patch read
 * as code; a file body in mono; the message a describe wrote; a split's two
 * roles; and for the table-shaped tools a row each.
 */
export function VcsToolRows({ item }: VcsToolRowsProps): JSX.Element | null {
  const tool = item.name.toLowerCase();

  if (item.status === "running")
    return <ToolRunning text={RUNNING_TEXT[tool] ?? "reading the repo"} />;

  const view = vcsToolViewOf(item.name, item.args, item.details, item.status);

  if (view === null) return <ToolUnknownResult item={item} tool={tool} />;

  if (tool === VCS_FILE_SPLIT_TOOL || tool === VCS_HUNK_SPLIT_TOOL)
    return <VcsSplitRows view={view} />;

  if (!cardHasInk(view)) return null;

  if (tool === VCS_FILE_DIFF_TOOL)
    return (
      <>
        <VcsViewBody view={view} />
        {view.patch === "" ? null : <PatchDiff patch={view.patch} fileHeader />}
      </>
    );

  if (tool === VCS_FILE_HISTORY_SHOW_TOOL)
    return (
      <>
        <VcsViewBody view={view} />
        <VcsFileBody
          path={toolCellOf(view.cells, "path")}
          content={view.content}
        />
      </>
    );

  if (tool === VCS_DESCRIBE_TOOL)
    return (
      <VcsViewBody
        view={view}
        before={<VcsMessageBody text={view.content} />}
      />
    );

  return <VcsViewBody view={view} />;
}
