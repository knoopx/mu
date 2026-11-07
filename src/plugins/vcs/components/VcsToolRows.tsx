/**
 * Draws a vcs tool call in the transcript. Each tool answers the model in
 * aligned columns and the log in structured details; this file paints the
 * details — chips for identities, rows for data, a real diff, a real file body.
 * The rows themselves are core's: this file only says which badges a vcs state
 * wears and which tool gets which extra block.
 */

import type { JSX, ReactNode } from "react";
import {
  ToolDiff,
  useAdwaita,
  type AdwaitaTheme,
  type IconName,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import {
  ToolChips,
  ToolDataRow,
  ToolRunning,
  ToolStateNote,
  ToolSummary,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import {
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import { buildNativeTheme } from "../../core/lib/ui/theme";
import {
  toolCellOf,
  toolStatusIcon,
  toolStatusTone,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import { toolGapColumn } from "../../core/lib/ui/toolRows";
import {
  outputPanel,
  previewLineHeight,
} from "../../core/lib/ui/transcriptLayout";
import { plainOutputOf } from "../../core/lib/ui/toolOutputMode";
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
import type { VcsToolStatus, VcsToolView } from "../types";
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

/** A status that answers in its own words whatever tool it belongs to. */
const STATED_STATUS: Readonly<Record<string, string>> = {
  unsupported: "no jj repo",
  binary: "binary file",
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
  clean: ["empty-selected", "empty", "none"],
  empty: EMPTY_TEXT,
  emptyDefault: "nothing found",
  stated: STATED_STATUS,
};

/** True for the ten vcs tools — matched by their names, never retyped. */
export function isVcsTool(name: string): boolean {
  return VCS_TOOL_NAMES.includes(name.toLowerCase());
}

/**
 * The one line in the tool header: what is running, why it failed, and when
 * the call answered — the scope it read (path, revset, rev, op log). The
 * counts, ids and patch belong to the rows below, so the header never says
 * what the rows paint, and the rows never repeat the header.
 */
export const vcsToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    vcsToolViewOf(item.name, item.args, item.details, item.status),
    VCS_WORDS,
    scopeOf,
  );

/** The request a tool was pointed at, read back from its chips. */
function scopeOf(tool: string, view: VcsToolView): string {
  if (tool === VCS_OPLOG_TOOL) return "op log";
  if (PATH_TOOLS.includes(tool)) return toolCellOf(view.cells, "path");
  if (tool === VCS_DESCRIBE_TOOL)
    return join([toolCellOf(view.cells, "rev"), toolCellOf(view.cells, "change")]);
  if (tool === VCS_FILE_SPLIT_TOOL)
    return join([toolCellOf(view.cells, "rev"), toolCellOf(view.cells, "files")]);
  return toolCellOf(view.cells, "rev");
}

function join(parts: readonly string[]): string {
  return parts.filter((part) => part !== "").join(" · ");
}

const toneOf = (status: VcsToolStatus | ""): ToolRowTone =>
  toolStatusTone(status, VCS_STATUS_TONES);

const iconOf = (status: VcsToolStatus | ""): IconName =>
  toolStatusIcon(status, VCS_STATUS_ICONS);

/** The note of a view, painted only when there is one to paint. */
function VcsNote({ view }: { view: VcsToolView }): JSX.Element | null {
  if (view.note === "") return null;
  return (
    <ToolStateNote
      icon={iconOf(view.status)}
      tone={toneOf(view.status)}
      text={view.note}
    />
  );
}

/** Chips, summary, rows and note — the shape every table-shaped vcs tool shares. */
function VcsViewBody({
  view,
  tone,
  after,
  summaryFirst = false,
}: {
  view: VcsToolView;
  tone?: ToolRowTone;
  after?: ReactNode;
  summaryFirst?: boolean;
}): JSX.Element {
  const t = useAdwaita();
  const chips = <ToolChips cells={view.cells} />;
  const summary = (
    <ToolSummary
      text={view.headline}
      tone={tone ?? (view.status === "ok" ? "neutral" : toneOf(view.status))}
    />
  );
  return (
    <div style={toolGapColumn(t)}>
      {summaryFirst ? summary : chips}
      {summaryFirst ? chips : summary}
      {view.rows.map((row, index) => (
        <ToolDataRow
          key={row.key}
          row={row}
          first={index === 0}
          variants={VCS_BADGE_VARIANTS}
        />
      ))}
      <VcsNote view={view} />
      {after ?? null}
    </div>
  );
}

const bodyCard = (t: AdwaitaTheme): StyleDesc => ({
  ...outputPanel(t),
  flexShrink: 0,
});

/** A file's body at a revision, as monospace code in a panel, bounded by a line budget. */
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
    <div style={bodyCard(t)}>
      <code
        code={plainOutputOf(content)}
        path={path}
        theme={buildNativeTheme(t)}
        style={{
          maxHeight: 40 * lineHeight,
          overflow: "hidden",
          flexShrink: 0,
          fontSize: t.type.caption,
          lineHeight,
          fontFamily: t.type.fontFamilyMono,
          color: t.color.text.primary,
        }}
      />
    </div>
  );
}

/** The tool item to render, exactly as the transcript holds it. */
export interface VcsToolRowsProps {
  item: ToolTranscriptItem;
}

/**
 * The result of a vcs call: a running block while it works; a state line when
 * it failed, found no repo, selected nothing or found nothing; the patch
 * through ToolDiff; a file body in mono; a split's two roles; and for the
 * table-shaped tools a row each.
 */
export function VcsToolRows({ item }: VcsToolRowsProps): JSX.Element {
  const tool = item.name.toLowerCase();

  if (item.status === "running")
    return <ToolRunning text={RUNNING_TEXT[tool] ?? "reading the repo"} />;

  const view = vcsToolViewOf(item.name, item.args, item.details, item.status);

  if (view === null) return <ToolUnknownResult item={item} tool={tool} />;

  if (tool === VCS_FILE_SPLIT_TOOL || tool === VCS_HUNK_SPLIT_TOOL)
    return <VcsSplitRows view={view} />;

  if (tool === VCS_FILE_DIFF_TOOL)
    return (
      <>
        <VcsViewBody view={view} />
        {view.patch === "" ? null : (
          <ToolDiff patch={view.patch} fileHeader={false} />
        )}
      </>
    );

  if (tool === VCS_FILE_HISTORY_SHOW_TOOL)
    return (
      <>
        <VcsViewBody view={view} />
        <VcsFileBody path={toolCellOf(view.cells, "path")} content={view.content} />
      </>
    );

  if (tool === VCS_DESCRIBE_TOOL)
    return (
      <VcsViewBody
        view={view}
        summaryFirst
        tone={view.status === "ok" ? "accent" : toneOf(view.status)}
      />
    );

  return <VcsViewBody view={view} />;
}
