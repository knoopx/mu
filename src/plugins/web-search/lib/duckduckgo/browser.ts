import { spawn } from "node:child_process";

import { MAX_STDOUT_BYTES, OBSURA_BIN, SEARCH_TIMEOUT_MS } from "./constants";
import { firstLine } from "../../../../utils/truncate";

export class BrowserMissingError extends Error {
  constructor(bin: string) {
    super(
      `The DuckDuckGo engine needs the \`${bin}\` headless browser on PATH — install it to enable search.`,
    );
    this.name = "BrowserMissingError";
  }
}

export class SearchCancelledError extends Error {
  constructor() {
    super("The search was cancelled.");
    this.name = "SearchCancelledError";
  }
}

function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timer = AbortSignal.timeout(ms);
  if (signal === undefined) return timer;
  if (signal.aborted) return signal;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (timer.aborted) abort();
  signal.addEventListener("abort", abort, { once: true });
  timer.addEventListener("abort", abort, { once: true });
  return controller.signal;
}

export interface EvalPageRequest {
  url: string;
  script: string;
  signal?: AbortSignal;
  bin?: string;
  timeoutMs?: number;
}

export function evalPage({
  url,
  script,
  signal,
  bin = OBSURA_BIN,
  timeoutMs = SEARCH_TIMEOUT_MS,
}: EvalPageRequest): Promise<string> {
  const run = withTimeout(signal, timeoutMs);

  return new Promise<string>((resolve, reject) => {
    if (run.aborted) {
      reject(new SearchCancelledError());
      return;
    }

    const child = spawn(bin, ["fetch", url, "--quiet", "--eval", script], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      run.removeEventListener("abort", onAbort);
      fn();
    };

    const onAbort = () => {
      child.kill("SIGKILL");
      settle(() => reject(new SearchCancelledError()));
    };

    child.stdout?.on("data", (chunk: Buffer) => {
      if (stdout.length > MAX_STDOUT_BYTES) return;
      stdout += chunk.toString("utf8");
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      if (stderr.length < MAX_STDOUT_BYTES) stderr += chunk.toString("utf8");
    });

    child.on("error", (error: NodeJS.ErrnoException) => {
      settle(() =>
        reject(
          error.code === "ENOENT"
            ? new BrowserMissingError(bin)
            : new Error(`Search could not run: ${error.message}`),
        ),
      );
    });

    child.on("close", (code) => {
      if (run.aborted) {
        settle(() => reject(new SearchCancelledError()));
        return;
      }
      if (code === 0) {
        settle(() => resolve(stdout));
        return;
      }
      const detail = firstLine(stderr);
      settle(() =>
        reject(
          new Error(
            detail === ""
              ? `Search failed (exit ${code ?? "signal"}).`
              : `Search failed: ${detail}`,
          ),
        ),
      );
    });

    run.addEventListener("abort", onAbort, { once: true });
  });
}
