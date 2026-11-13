import { spawn } from "node:child_process";

/**
 * Handing one argument to a program outside mu — a file to the desktop, a link
 * to a browser — and waiting for nothing afterwards.
 *
 * The child is detached with its stdio ignored: whatever answers is the user's
 * program, not mu's, so it opens wherever their own desktop points, resolves its
 * own bindings, and outlives the window that asked for it. Waiting for the
 * child's own `spawn` event is the one thing that makes an answer true — a name
 * that is not on the road fails there, and a notice sent earlier would promise
 * a program nobody started.
 */
export function spawnProgram(
  command: string,
  argument: string,
  env?: NodeJS.ProcessEnv,
): Promise<void> {
  return new Promise<void>((started, failed) => {
    const child = spawn(command, [argument], {
      detached: true,
      stdio: "ignore",
      ...(env === undefined ? {} : { env }),
    });
    child.once("error", (error: Error) => failed(error));
    child.once("spawn", () => {
      child.unref();
      started();
    });
  });
}

/** The desktop launchers, in the order an argument is handed to one of them. */
const LAUNCHERS = ["xdg-open", "open"];

/** Whether a launcher started, and why none of them did. */
export type LaunchResult = { ok: true } | { ok: false; error: string };

/**
 * Hand one argument to the desktop's default handler.
 *
 * `xdg-open` is the answer on Linux and `open` is the answer on macOS, and a
 * machine with neither is reported rather than guessed past: the chain stops at
 * the first launcher that started, and a launcher that exists but failed is the
 * answer, not an invitation to try the next name.
 */
export async function launchDefaultApp(
  argument: string,
  env?: NodeJS.ProcessEnv,
): Promise<LaunchResult> {
  const attempted: string[] = [];

  for (const command of LAUNCHERS) {
    try {
      await spawnProgram(command, argument, env);
      return { ok: true };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") {
        const reason = error instanceof Error ? error.message : String(error);
        return {
          ok: false,
          error: `${command} could not be started — ${reason}`,
        };
      }
      attempted.push(command);
    }
  }

  return {
    ok: false,
    error: `no launcher available (${attempted.join(", ")} not found)`,
  };
}
