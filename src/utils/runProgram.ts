import { spawn } from "node:child_process";

/**
 * One short-lived program whose stdout is the answer.
 *
 * A page read, a search page and an analyser CLI all want the same four things:
 * the child is killed when the tool call is cancelled, it is killed when its wall
 * clock runs out, its output is bounded before it reaches the log, and a name that
 * is not on the road is reported instead of guessed past. `launcher.ts` is the
 * other half of the same problem — a program the user owns, detached, whose answer
 * is nobody's business — and this is the half where mu reads the answer.
 *
 * A non-zero exit is an answer, not an exception: what it means belongs to the
 * program's caller, which is the only thing that knows what the exit was for.
 */

/** The program could not be started at all: its name is not on the road. */
export class ProgramMissingError extends Error {
  constructor(command: string) {
    super(`${command} is not on PATH`);
    this.name = "ProgramMissingError";
  }
}

/** The call was cancelled, by the user or by the wall clock it was given. */
export class ProgramCancelledError extends Error {
  constructor() {
    super("the call was cancelled");
    this.name = "ProgramCancelledError";
  }
}

export interface ProgramRun {
  command: string;
  args: readonly string[];

  /** what the call was doing, so a timeout or a missing program names the call */
  subject: string;

  signal?: AbortSignal;
  timeoutMs?: number;

  /** past this many bytes the child's output stops being collected */
  maxOutputBytes?: number;
}

export interface ProgramOutput {
  stdout: string;
  stderr: string;

  /** the child's exit code, or null when a signal ended it */
  code: number | null;
}

/** The caller's cancellation and mu's own clock, whichever lands first. */
function runSignal(
  signal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const timer = AbortSignal.timeout(timeoutMs);
  if (signal === undefined) return timer;
  if (signal.aborted) return signal;

  const controller = new AbortController();
  const abort = (): void => controller.abort();
  timer.addEventListener("abort", abort, { once: true });
  signal.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

export function runProgram({
  command,
  args,
  subject,
  signal,
  timeoutMs = 60_000,
  maxOutputBytes = 4_000_000,
}: ProgramRun): Promise<ProgramOutput> {
  const run = runSignal(signal, timeoutMs);

  return new Promise<ProgramOutput>((resolve, reject) => {
    if (run.aborted) {
      reject(new ProgramCancelledError());
      return;
    }

    const child = spawn(command, [...args], {
      stdio: ["ignore", "pipe", "pipe"],
      signal: run,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      run.removeEventListener("abort", onAbort);
      fn();
    };

    const onAbort = (): void => {
      child.kill("SIGKILL");
      settle(() => reject(new ProgramCancelledError()));
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      if (stdout.length > maxOutputBytes) return;
      stdout += chunk.toString("utf8");
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < maxOutputBytes) stderr += chunk.toString("utf8");
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      settle(() =>
        reject(
          error.code === "ENOENT"
            ? new ProgramMissingError(command)
            : new Error(`${subject} could not run: ${error.message}`),
        ),
      );
    });

    child.on("close", (code) => {
      if (run.aborted) {
        settle(() => reject(new ProgramCancelledError()));
        return;
      }
      settle(() => resolve({ stdout, stderr, code }));
    });

    run.addEventListener("abort", onAbort, { once: true });
  });
}
