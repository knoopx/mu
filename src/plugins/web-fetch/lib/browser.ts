/**
 * One page, rendered, answered as text.
 *
 * The browser is the same program mu's search runs, and for the same reason: the
 * page is rendered, so a documentation site that draws its body with JavaScript
 * still answers with its body, and `--dump markdown` converts it on the way out.
 * The spawn itself — the clock, the cancellation, the output bound — is the app's
 * own `runProgram`, not a second copy of it.
 */

import {
  ProgramCancelledError,
  ProgramMissingError,
  runProgram,
} from "../../../utils/runProgram";
import { firstLine } from "../../../utils/truncate";
import {
  MAX_STDOUT_BYTES,
  OBSURA_BIN,
  PAGE_LOAD_TIMEOUT_S,
  PAGE_READ_TIMEOUT_MS,
} from "../constants";

export async function fetchPageText(
  url: string,
  signal?: AbortSignal,
): Promise<string> {
  const run = await runProgram({
    command: OBSURA_BIN,
    args: [
      "fetch",
      url,
      "--dump",
      "markdown",
      "--quiet",
      "--timeout",
      String(PAGE_LOAD_TIMEOUT_S),
    ],
    subject: "page read",
    signal,
    timeoutMs: PAGE_READ_TIMEOUT_MS,
    maxOutputBytes: MAX_STDOUT_BYTES,
  }).catch((error: unknown) => {
    if (error instanceof ProgramMissingError)
      throw new Error(
        `Reading a page needs the \`${OBSURA_BIN}\` headless browser on PATH — install it to enable web-fetch.`,
      );
    if (error instanceof ProgramCancelledError)
      throw new Error("The page read was cancelled.");
    throw error;
  });

  if (run.code !== 0) {
    const detail = firstLine(run.stderr);
    throw new Error(
      detail === ""
        ? `The page could not be read (exit ${run.code ?? "signal"}).`
        : `The page could not be read: ${detail}`,
    );
  }

  return run.stdout;
}
