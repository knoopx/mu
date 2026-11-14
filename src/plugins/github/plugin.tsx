/**
 * github — nine kinds of thing, none shaped like another.
 *
 * What it registers is a body and the header's one line, like every other plugin:
 * the log draws the band and the header over it, and the nine cards fill the body
 * with what their kind actually is — a description, a folder's tree, a file's text, a
 * change's rows, a thread, a hit list — while the header carries the call: its scope,
 * its status and the record's figures as chips. That is why there is no shared table
 * for the nine kinds and no widget they share.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { githubCommitTool } from "./tools/githubCommit";
import { githubFileTool } from "./tools/githubFile";
import { githubIssueTool } from "./tools/githubIssue";
import { githubPrTool } from "./tools/githubPr";
import { githubReleaseTool } from "./tools/githubRelease";
import { githubRepoTool } from "./tools/githubRepo";
import { githubSearchTool } from "./tools/githubSearch";
import { githubTreeTool } from "./tools/githubTree";
import { githubUserTool } from "./tools/githubUser";
import {
  GithubToolRows,
  githubHasBody,
  isGithubTool,
} from "./components/GithubToolRows";
import { githubChipsOf, githubToolPreviewOf } from "./lib/toolView";

export const githubPlugin = definePlugin(
  "github",
  {
    title: "GitHub",
    summary:
      "Nine reads of repositories, files, pull requests, issues, releases, commits, search and profiles.",
    icon: "hub",
    category: "project",
  },
  (app) => {
    app.tools.register(
      githubRepoTool,
      githubFileTool,
      githubTreeTool,
      githubPrTool,
      githubIssueTool,
      githubReleaseTool,
      githubCommitTool,
      githubSearchTool,
      githubUserTool,
    );

    app.log.rows({
      key: "github",
      owns: isGithubTool,
      // A read with no text under it is its header line and no plate.
      body: (item) =>
        githubHasBody(item) ? <GithubToolRows item={item} /> : null,
      // A card is a stack of sections and each section brings its own plate, so the
      // row frames itself: files end where a description starts, and the reader sees
      // that boundary instead of inferring it from a wider gap in one plate.
      frame: "page",
      preview: githubToolPreviewOf,
      // One header per row: the record's figures are its chips, not a band above its
      // content.
      chips: githubChipsOf,
    });
  },
);
