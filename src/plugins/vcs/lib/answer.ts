/**
 * How a vcs call answers when it has nothing to report.
 *
 * A tool answers in its full details shape even when the location holds no
 * repo, the revision cannot be resolved, or a required parameter is missing —
 * the log paints a row for a failure too, and the model reads the same fields
 * either way. The scope fields of that answer (the path, the revision, the
 * counts at zero, the empty row list) belong to the tool; the two status
 * fields and the CLI the answer came from do not, so they are filled here and
 * named once.
 */

import type { AgentToolResult } from "@earendil-works/pi-coding-agent";

import { NOT_A_JJ_REPO } from "./ops";
import { toolResult } from "../../core/lib/agent/toolText";
import type { VcsToolStatus } from "../types";

/** What every details object carries, whatever a tool wraps around it. */
interface VcsAnswer {
  status: VcsToolStatus;
  error: string;
}

/**
 * The scope fields of an answer, with nothing resolved in them. A tool states
 * this once and answers three failures from it, so a field cannot be added to
 * one branch and forgotten in the others.
 */
export type VcsBlank<D> = Omit<D, "status" | "error">;

function answered<D extends VcsAnswer>(
  blank: VcsBlank<D>,
  status: VcsToolStatus,
  text: string,
): AgentToolResult<D> {
  // Only a details object that names the CLI it read carries `vcs`, and only
  // a call that reached one can name it: `jj` for a failure of the CLI, empty
  // for a location with no repo in it at all.
  const details = {
    ...blank,
    ...("vcs" in blank ? { vcs: status === "unsupported" ? "" : "jj" } : {}),
    status,
    error: text,
  } as unknown as D;

  return toolResult(text, details);
}

/** The location holds no repo, so no CLI was reached. */
export const noRepoResult = <D extends VcsAnswer>(
  blank: VcsBlank<D>,
): AgentToolResult<D> => answered(blank, "unsupported", NOT_A_JJ_REPO);

/** The call reached the CLI and was told no. */
export const failedResult = <D extends VcsAnswer>(
  blank: VcsBlank<D>,
  error: string,
): AgentToolResult<D> => answered(blank, "failed", error);

/** A required parameter is missing — the call never left the harness. */
export const missingResult = <D extends VcsAnswer>(
  blank: VcsBlank<D>,
  parameter: string,
): AgentToolResult<D> =>
  failedResult(blank, `missing required parameter: ${parameter}`);

/** The revision the call named does not resolve to a commit. */
export const unresolvedResult = <D extends VcsAnswer>(
  blank: VcsBlank<D>,
  rev: string,
): AgentToolResult<D> => failedResult(blank, `cannot resolve revision ${rev}`);
