/**
 * github — nine kinds of thing, none shaped like another.
 *
 * What it registers is a body and the header's one line, like every other plugin:
 * the log draws the band and the header over it, and the nine cards fill the body
 * with what their kind actually is — a record's figures, a folder's tree, a file's
 * text, a change's rows, a thread, a hit list — which is why there is no shared
 * table for them and no widget they share.
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
  isGithubTool,
} from "./components/GithubToolRows";
import { githubToolPreviewOf } from "./lib/toolView";

export const githubPlugin = definePlugin("github", (app) => {
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
    body: (item) => <GithubToolRows item={item} />,
    preview: githubToolPreviewOf,
  });
});
