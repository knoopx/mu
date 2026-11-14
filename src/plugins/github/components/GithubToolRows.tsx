/**
 * The body of a GitHub call: the card its kind has.
 *
 * The header and the band are core's, so this file only chooses what stands on
 * the plate — the nine cards and the states a card cannot speak for: a read still
 * going, an answer this plugin does not recognise, and a refusal or an empty read
 * in GitHub's own words. A read that came back with nothing still opens with the
 * record it looked for, because the reader needs to know which file, folder or
 * number came up empty.
 */

import type { JSX } from "react";
import type { IconName } from "adwaita-gpuix";

import {
  ToolRunning,
  ToolStatusNote,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import type { ToolRowTone } from "../../core/lib/ui/toolRowPaint";
import { GITHUB_TOOL_KINDS, GITHUB_TOOL_NAMES } from "../constants";
import { wordsOf } from "../lib/kinds/vocabulary";
import { githubToolViewOf, type GithubToolView } from "../lib/toolView";
import { Identity } from "./chrome";
import { CommitRow } from "./CommitRow";
import { FileRow } from "./FileRow";
import { IssueRow } from "./IssueRow";
import { ProfileRow } from "./ProfileRow";
import { PullRow } from "./PullRow";
import { ReleaseRow } from "./ReleaseRow";
import { RepoRow } from "./RepoRow";
import { SearchRow } from "./SearchRow";
import { TreeRow } from "./TreeRow";

/** True for the nine GitHub tools — matched by their names, never retyped. */
export function isGithubTool(name: string): boolean {
  return GITHUB_TOOL_NAMES.includes(name.toLowerCase());
}

/** What a read of this kind says while it is going. */
const runningWordsOf = (name: string): string =>
  wordsOf(GITHUB_TOOL_KINDS[name.toLowerCase()] ?? "repo").running;

/** The marks a GitHub answer's own states wear, added to the log's vocabulary. */
const STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  empty: "warn",
  binary: "warn",
};

const STATUS_ICONS: Readonly<Record<string, IconName>> = {
  empty: "search-off",
  binary: "warning",
};

/** The UI this kind of thing has. */
function card(view: GithubToolView): JSX.Element {
  switch (view.call.kind) {
    case "file":
      return <FileRow view={view} />;
    case "tree":
      return <TreeRow view={view} />;
    case "pr":
      return <PullRow view={view} />;
    case "commit":
      return <CommitRow view={view} />;
    case "issue":
      return <IssueRow view={view} />;
    case "release":
    case "releases":
      return <ReleaseRow view={view} />;
    case "search":
      return <SearchRow view={view} />;
    case "user":
      return <ProfileRow view={view} />;
    default:
      return <RepoRow view={view} />;
  }
}

/** A call that found nothing, or nothing it could read: the record it looked for,
 *  and why it is not there. */
function emptyBody(
  view: GithubToolView,
  note: string,
): JSX.Element {
  return (
    <>
      <Identity {...view.identity} />
      <ToolStatusNote
        status={view.status}
        note={note}
        tones={STATUS_TONES}
        icons={STATUS_ICONS}
      />
    </>
  );
}

/**
 * A GitHub call: what it says while it runs, what GitHub's refusal says in its own
 * words, or the card this kind of thing has.
 */
export function GithubToolRows({
  item,
}: {
  item: ToolTranscriptItem;
}): JSX.Element {
  const tool = item.name.toLowerCase();

  if (item.status === "running")
    return <ToolRunning text={runningWordsOf(tool)} />;

  const view = githubToolViewOf(item.name, item.args, item.details, item.status);

  if (view === null) return <ToolUnknownResult item={item} tool={tool} />;

  if (view.status === "failed" || view.status === "unsupported")
    return emptyBody(view, view.note);

  if (view.status === "empty" || view.status === "binary")
    return emptyBody(
      view,
      view.status === "binary" ? view.note : view.words.emptyNote(view.call),
    );

  return card(view);
}
