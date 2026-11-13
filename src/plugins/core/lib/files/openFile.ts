import { withoutMuLoaderEnv } from "../utils/loaderEnv";
import { launchDefaultApp, spawnProgram } from "../../../../utils/launcher";
import { projectFile } from "./projectPath";

export interface FileOpenResult {
  ok: boolean;
  error?: string;
}

/** Which program an open handed the row to; the notice says it in words. */
export type OpenTarget = "editor" | "default app";

/** The editor the user asked for; `vi` is what answers when they asked for nothing. */
const editorCommand = (): string => process.env.EDITOR ?? "vi";

/**
 * What an open is worth saying, in the two parts a notice is made of.
 *
 * One wording for every panel that opens a file: the name the row showed, the
 * program it went to, and the reason when nothing started. The program is said
 * because a panel now has two open keys and a reader has to be able to tell
 * which one they pressed.
 */
export function openNotice(
  result: FileOpenResult,
  name: string,
  target: OpenTarget,
): { message: string; type: "info" | "warning" } {
  return result.ok
    ? { message: `Opening ${name} in the ${target}`, type: "info" }
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
    await spawnProgram(command, file.target, withoutMuLoaderEnv(process.env));
    return { ok: true };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { ok: false, error: `${command} could not be started — ${reason}` };
  }
}

/**
 * Hand one of the project's files to whatever the desktop says opens it.
 *
 * The default app is the user's answer to a file type rather than mu's guess at
 * one, so a picture, a pdf and a spreadsheet each go where their own row would
 * go in the file manager. The guard is the editor's: the same absolute path
 * inside the folder, refused before anything is launched.
 */
export async function openFileInDefaultApp(
  cwd: string,
  path: string,
): Promise<FileOpenResult> {
  const file = projectFile(cwd, path);
  if (!file.ok) return file;

  return launchDefaultApp(file.target, withoutMuLoaderEnv(process.env));
}
