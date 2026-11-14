/**
 * github — nine kinds of thing, none shaped like another.
 *
 * It registers the whole log row rather than a body inside the shared tool row: a
 * repository record, a file, a changeset, a thread of replies and a hit list are
 * not columns of one table, and a generic header over them would repeat what the
 * call's own header already says. A guardrails block sits under it like under any
 * other call, read from guardrails here because this row is github's to draw.
 */

import { ToolContent } from "adwaita-gpuix";
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
import { GithubToolRows, isGithubTool } from "./components/GithubToolRows";
import {
  GuardrailBlockRows,
  guardrailBlockOf,
} from "../guardrails/components/GuardrailBlockRows";

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
    row: (item) => {
      const block = guardrailBlockOf(item);
      return (
        <>
          <GithubToolRows item={item} />
          {block === null ? null : (
            <ToolContent open>
              <GuardrailBlockRows hit={block} />
            </ToolContent>
          )}
        </>
      );
    },
  });
});
