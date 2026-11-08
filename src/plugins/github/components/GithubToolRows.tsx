/**
 * Draws a GitHub call in the transcript.
 *
 * The chips, the rows, the notes and the running block are core's; this file
 * owns the words a GitHub answer has that no other answer has (what each tool is
 * doing while it runs, and what its empty answer means), the badge each GitHub
 * state wears, and the two bodies a call can carry: a file's text as code, and a
 * pull request's, an issue's or a release's prose as markdown. Both stand in the
 * panel the log already uses for a body, because a GitHub call is a read of
 * somewhere else and should not look like a card of its own.
 */

import type { JSX } from "react";
import { useAdwaita, type AdwaitaTheme, type IconName } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import {
  ToolChips,
  ToolRowList,
  ToolRunning,
  ToolStatusNote,
  ToolSummary,
  ToolTruncated,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import { Markdown } from "../../core/components/Markdown";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import {
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import { MAX_OUTPUT_LINES, plainOutputOf } from "../../core/lib/ui/toolOutputMode";
import { mutedText } from "../../core/lib/ui/theme";
import { buildNativeTheme } from "../../core/lib/ui/theme";
import {
  toolBodyStack,
  toolCellOf,
  toolStatusTone,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import {
  outputPanel,
  previewLineHeight,
} from "../../core/lib/ui/transcriptLayout";
import {
  GITHUB_BADGE_VARIANTS,
  GITHUB_COMMIT_TOOL,
  GITHUB_FILE_TOOL,
  GITHUB_ISSUE_TOOL,
  GITHUB_PR_TOOL,
  GITHUB_RELEASE_TOOL,
  GITHUB_REPO_TOOL,
  GITHUB_SEARCH_TOOL,
  GITHUB_TOOL_LABELS,
  GITHUB_TOOL_NAMES,
  GITHUB_TREE_TOOL,
  GITHUB_USER_TOOL,
} from "../constants";
import { unitOf } from "../lib/answer";
import { githubToolViewOf, type GithubToolView } from "../lib/toolView";

const RUNNING_TEXT: Record<string, string> = {
  [GITHUB_REPO_TOOL]: "reading the repository",
  [GITHUB_FILE_TOOL]: "reading the file",
  [GITHUB_TREE_TOOL]: "listing the folder",
  [GITHUB_PR_TOOL]: "reading the pull request",
  [GITHUB_ISSUE_TOOL]: "reading the issue",
  [GITHUB_RELEASE_TOOL]: "reading the releases",
  [GITHUB_COMMIT_TOOL]: "reading the commit",
  [GITHUB_SEARCH_TOOL]: "searching GitHub",
  [GITHUB_USER_TOOL]: "reading the profile",
};

const EMPTY_TEXT: Record<string, string> = {
  [GITHUB_REPO_TOOL]: "no repository",
  [GITHUB_FILE_TOOL]: "empty file",
  [GITHUB_TREE_TOOL]: "the folder is empty",
  [GITHUB_PR_TOOL]: "no pull request",
  [GITHUB_ISSUE_TOOL]: "no comments",
  [GITHUB_RELEASE_TOOL]: "no releases",
  [GITHUB_COMMIT_TOOL]: "no files changed",
  [GITHUB_SEARCH_TOOL]: "no matches",
  [GITHUB_USER_TOOL]: "no profile",
};

/** A status that answers in its own words whatever tool it belongs to. */
const STATED_STATUS: Readonly<Record<string, string>> = {
  unsupported: "GitHub could not be read",
  binary: "not a text file",
};

/** The states a GitHub vocabulary adds to the shared status tones and icons. */
const GITHUB_STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  empty: "warn",
  binary: "warn",
};

const GITHUB_STATUS_ICONS: Readonly<Record<string, IconName>> = {
  binary: "warning",
  empty: "warning",
};

/** What the nine tools say about themselves, in their own words. */
const GITHUB_WORDS: ToolPreviewVocabulary = {
  running: RUNNING_TEXT,
  runningDefault: "reading GitHub",
  clean: ["empty"],
  empty: EMPTY_TEXT,
  emptyDefault: "nothing found",
  stated: STATED_STATUS,
};

/** The target of a call, whichever of its possible names it answers under. */
const TARGET_LABELS: readonly string[] = ["pr", "issue", "tag", "commit", "login"];

/** True for the nine GitHub tools — matched by their names, never retyped. */
export function isGithubTool(name: string): boolean {
  return GITHUB_TOOL_NAMES.includes(name.toLowerCase());
}

function targetOf(view: GithubToolView): string {
  for (const label of TARGET_LABELS) {
    const value = toolCellOf(view.cells, label);
    if (value !== "") return value;
  }
  return "";
}

/** The request a call was pointed at: which repository, which thing inside it. */
function scopeOf(tool: string, view: GithubToolView): string {
  if (tool === GITHUB_SEARCH_TOOL)
    return view.call.query === ""
      ? `search ${view.call.target}`
      : `${view.call.target}: ${view.call.query}`;
  if (tool === GITHUB_USER_TOOL) return view.call.target;

  const repo = toolCellOf(view.cells, "repo");
  const path = toolCellOf(view.cells, "path");
  if (path !== "") return `${repo} · ${path}`;
  if (tool === GITHUB_TREE_TOOL) return `${repo} · root`;

  const target = targetOf(view);
  return target === "" ? repo : `${repo} · ${target}`;
}

/**
 * The one line in the tool header: what is running, why it failed, and when the
 * call answered — the scope it read, never the counts and bodies the rows paint.
 */
export const githubToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    githubToolViewOf(item.name, item.args, item.details, item.status),
    GITHUB_WORDS,
    scopeOf,
  );

const toneOf = (status: string): ToolRowTone =>
  toolStatusTone(status, GITHUB_STATUS_TONES);

const bodyPanel = (t: AdwaitaTheme): StyleDesc => ({
  ...outputPanel(t),
  flexShrink: 0,
});

/** A file's text, as monospace code in the log's own panel, bounded by a line budget. */
function GithubFileBody({
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
    <div style={bodyPanel(t)}>
      <code
        code={plainOutputOf(content, MAX_OUTPUT_LINES, "head")}
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
    </div>
  );
}

/** The prose of a pull request, an issue, a release or a commit message. */
function GithubProseBody({ source }: { source: string }): JSX.Element | null {
  const t = useAdwaita();
  if (source.trim() === "") return null;

  return (
    <div style={bodyPanel(t)}>
      <Markdown
        source={source}
        theme={buildNativeTheme(t)}
        style={{ padding: 0, flexShrink: 1, minWidth: 0 }}
      />
    </div>
  );
}

/** What fell off the answer, in one line: rows, characters, or both. */
function omittedNote(view: GithubToolView): string {
  const rows =
    view.omitted > 0
      ? `${String(view.omitted)} more ${unitOf(view.call.kind)}s not shown`
      : "";
  const chars =
    view.call.bodyOmitted > 0
      ? `${String(view.call.bodyOmitted)} more characters of the body not shown`
      : "";
  if (rows !== "" && chars !== "") return `${rows}, and ${chars}`;
  return rows || chars;
}

/**
 * The result of a GitHub call: a running block while it works; a state line when
 * GitHub refused it, could not be reached, read bytes that are not text, or found
 * nothing; then the record's chips, a one-line reading of it, the list's rows,
 * and the body — a file's text or a piece of prose.
 */
export function GithubToolRows({
  item,
}: {
  item: ToolTranscriptItem;
}): JSX.Element {
  const t = useAdwaita();
  const tool = item.name.toLowerCase();

  if (item.status === "running")
    return <ToolRunning text={RUNNING_TEXT[tool] ?? "reading GitHub"} />;

  const view = githubToolViewOf(item.name, item.args, item.details, item.status);
  if (view === null)
    return <ToolUnknownResult item={item} tool={GITHUB_TOOL_LABELS[tool] ?? tool} />;

  const note = omittedNote(view);

  return (
    <div style={toolBodyStack(t)}>
      <ToolChips cells={view.cells} />
      <ToolSummary
        text={view.headline}
        tone={view.status === "ok" ? "neutral" : toneOf(view.status)}
      />
      <ToolRowList rows={view.rows} variants={GITHUB_BADGE_VARIANTS} pressable={false} />
      <ToolStatusNote
        status={view.status}
        note={view.note}
        tones={GITHUB_STATUS_TONES}
        icons={GITHUB_STATUS_ICONS}
      />
      <ToolTruncated count={view.omitted + view.call.bodyOmitted} text={note} />
      {tool === GITHUB_FILE_TOOL ? (
        <GithubFileBody path={toolCellOf(view.cells, "path")} content={view.body} />
      ) : (
        <GithubProseBody source={view.body} />
      )}
      {view.status === "ok" && view.call.cached ? (
        <ToolCaptionLine
          color={mutedText(t)}
          text="read from mu's 24h cache — ask again with refresh for a live read"
        />
      ) : null}
    </div>
  );
}
