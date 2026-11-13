/**
 * A GitHub call owns its whole row.
 *
 * There is no shared tool box around a GitHub read: the card is the row. What the
 * call was pointed at, what came back and where it stands are said by the card
 * itself — an identity band, the record's counts, the widget that thing has (a tree,
 * a changeset, a thread, a timeline, a hit list, a file of code), and the prose
 * GitHub wrote. This file dispatches to the nine cards and carries the states a card
 * cannot speak for: a read still going, an answer this plugin does not recognise, and
 * a refusal or an empty read in GitHub's own words.
 */

import type { JSX } from "react";

import { StateSpinner } from "../../core/components/StateSpinner";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import {
  GITHUB_TOOL_KINDS,
  GITHUB_TOOL_LABELS,
  GITHUB_TOOL_NAMES,
} from "../constants";
import { wordsOf } from "../lib/kinds/vocabulary";
import { githubToolViewOf, type GithubToolView } from "../lib/toolView";
import { Band, Card, Identity, rowPage, Standing } from "./chrome";
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

/**
 * A GitHub call: what it says while it runs, what GitHub's refusal says in its own
 * words, or the card this kind of thing has. A read that came back with nothing
 * still opens with the record it looked for, because the reader needs to know which
 * file, folder or number came up empty.
 */
export function GithubToolRows({
  item,
}: {
  item: ToolTranscriptItem;
}): JSX.Element {
  const tool = item.name.toLowerCase();

  if (item.status === "running")
    return (
      <div style={rowPage()}>
        <Card>
          <Band first>
            <Standing
              icon="cloud-download"
              text={runningWordsOf(tool)}
              trailing={<StateSpinner />}
            />
          </Band>
        </Card>
      </div>
    );

  const view = githubToolViewOf(
    item.name,
    item.args,
    item.details,
    item.status,
  );

  if (view === null)
    return (
      <div style={rowPage()}>
        <Card>
          <Band first>
            <Standing
              icon="help"
              text={`${GITHUB_TOOL_LABELS[tool] ?? tool} answered in a shape this app does not know`}
            />
          </Band>
        </Card>
      </div>
    );

  if (view.status === "failed" || view.status === "unsupported")
    return (
      <div style={rowPage()}>
        <Card>
          <Band first>
            <Identity {...view.identity} />
            <Standing icon="error" text={view.note} tone="bad" />
          </Band>
        </Card>
      </div>
    );

  if (view.status === "empty" || view.status === "binary")
    return (
      <div style={rowPage()}>
        <Card>
          <Band first>
            <Identity {...view.identity} />
            <Standing
              icon={view.status === "binary" ? "warning" : "search-off"}
              text={
                view.status === "binary"
                  ? view.note
                  : view.words.emptyNote(view.call)
              }
              tone="warn"
            />
          </Band>
        </Card>
      </div>
    );

  return (
    <div style={rowPage()}>
      <Card>{card(view)}</Card>
    </div>
  );
}
