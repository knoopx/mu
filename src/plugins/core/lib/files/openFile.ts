import { spawn } from "node:child_process";
import { withoutMuLoaderEnv } from "../utils/loaderEnv";
import { projectFile } from "./projectPath";

export interface FileOpenResult {
  ok: boolean;
  error?: string;
}

/** The editor the user asked for; `vi` is what answers when they asked for nothing. */
const editorCommand = (): string => process.env.EDITOR ?? "vi";

/**
 * Start the editor and wait only for the answer that it started.
 *
 * The child is detached with its stdio ignored: an editor is the user's program,
 * not mu's, so it opens wherever their own terminal points, resolves its own
 * bindings, and outlives the panel that asked for it. Waiting for `spawn` is the
 * one thing that makes the answer true — a name that is not on the road fails
 * there, and a panel that toasted too early would promise a file nobody opened.
 */
function spawnEditor(command: string, target: string): Promise<void> {
  return new Promise<void>((started, failed) => {
    const child = spawn(command, [target], {
      detached: true,
      stdio: "ignore",
      env: withoutMuLoaderEnv(process.env),
    });
    child.once("error", (error: Error) => failed(error));
    child.once("spawn", () => {
      child.unref();
      started();
    });
  });
}

/**
 * What an open is worth saying, in the two parts a notice is made of.
 *
 * One wording for every panel that opens a file: the name the row showed, and
 * the reason when nothing started.
 */
export function openNotice(
  result: FileOpenResult,
  name: string,
): { message: string; type: "info" | "warning" } {
  return result.ok
    ? { message: `Opening ${name} in the editor`, type: "info" }
    : {
        message: `Open failed: ${result.error ?? "unknown error"}`,
        type: "warning",
      };
}

/**
 * Hand one of the project's files to the user's editor, as the panel labels it.
 *
 * The same read a delete runs through: the editor is given an absolute path
 * inside the folder the panel lists, never a name that walks out of it, and a
 * folder is refused rather than opened.
 */
export async function openFileInEditor(
  cwd: string,
  path: string,
): Promise<FileOpenResult> {
  const file = projectFile(cwd, path);
  if (!file.ok) return file;

  const command = editorCommand();
  try {
    await spawnEditor(command, file.target);
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `${command} could not be started — ${reason}` };
  }
}
