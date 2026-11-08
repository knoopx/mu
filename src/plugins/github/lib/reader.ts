/**
 * The half of a tool call that all nine share.
 *
 * A GitHub tool's `execute` is one read and one answer: the read builds a
 * `GithubCall` whatever happened, and this file says what that call is worth to
 * the model. Keeping it here means the nine tools differ only in the parameters
 * they declare and the reader they call.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";

import { toolResult } from "../../core/lib/agent/toolText";
import { githubAnswerOf } from "./answer";
import type { GithubReadInput } from "./api/read";
import type { GithubCall } from "../types";

export async function runRead(
  read: (input: GithubReadInput) => Promise<GithubCall>,
  input: GithubReadInput,
): Promise<AgentToolResult<GithubCall>> {
  const call = await read(input);
  return toolResult(githubAnswerOf(call), call);
}
