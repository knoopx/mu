/**
 * Moving the work to another project — which means another window, not this one.
 *
 * A mu window _is_ a working directory: the agent session, the file panel, the
 * repo panels and every relative path in the log all hang off the folder the
 * window was started in. Changing it under a running session would leave the
 * transcript talking about one folder while the tools answered in another, so the
 * switch opens a second window at the other path and leaves this one holding its
 * own conversation.
 */

import { spawnWindowIn } from "../../../window/newWindow";
import { displayPath } from "../../core/lib/utils/paths";
import type { ProjectWindowResult } from "../types";

export async function openProjectWindow(
  path: string,
): Promise<ProjectWindowResult> {
  return spawnWindowIn(path);
}

/** What the panel says once the window either opened there or did not. */
export function projectWindowNotice(result: ProjectWindowResult): string {
  return result.ok
    ? `New window in ${displayPath(result.cwd)}`
    : `New window failed: ${result.error}`;
}
