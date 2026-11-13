/**
 * The one file that names an analyser binary.
 *
 * A code-quality tool says which analyser to run, with what arguments, and in
 * which directory; it never names a flag or a shell. What comes back is one
 * `AnalyserRun`, and its `status` is already the answer vocabulary the tools
 * report in: the binary was not there, it ran out of time, or it ran and said
 * what it said.
 */

import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import {
  ANALYSER_TIMEOUT_MS,
  FALLOW_BINARY,
  JSON_FORMAT,
  JSON_VALUE,
  REVIEW_BINARY,
  RUNNER_BINARY,
} from "../constants";
import type { QualityToolStatus } from "../types";
import { withoutMuLoaderEnv } from "../../core/lib/utils/loaderEnv";

const pExecFile = promisify(execFile);

const MAX_BUFFER = 32 * 1024 * 1024;

export interface AnalyserRun {
  stdout: string;
  stderr: string;
  code: number;
  status: Exclude<QualityToolStatus, "empty" | "none">;
  error: string;
  command: string;
}

/** Where to run: the scope a call named, or here, and never a directory that is not there. */
export function scopeDir(path: string | undefined): {
  dir: string;
  error: string;
} {
  const asked = (path ?? "").trim();
  const dir = asked === "" ? process.cwd() : resolve(asked);
  if (!existsSync(dir)) return { dir, error: `no such directory: ${asked}` };
  return { dir, error: "" };
}

/** Every analyser answers in JSON, so a view never has to parse a table. */
const jsonArgs = (args: readonly string[]): string[] => [
  ...args,
  JSON_FORMAT,
  JSON_VALUE,
];

/** How an analyser is spoken about: the tools abstract the binary, so nothing the agent is told names it. */
const PROJECT_ANALYSER = "the project analyser";
const CHANGE_ANALYSER = "the change analyser";

export async function runFallow(
  args: readonly string[],
  cwd: string,
): Promise<AnalyserRun> {
  return run(
    [RUNNER_BINARY, [FALLOW_BINARY, ...jsonArgs(args)]],
    cwd,
    PROJECT_ANALYSER,
  );
}

export async function runReview(
  args: readonly string[],
  cwd: string,
): Promise<AnalyserRun> {
  return run([REVIEW_BINARY, args], cwd, CHANGE_ANALYSER);
}

/** What `execFile` reports when a spawn fails, in the parts this file can read. */
interface ExecFailure {
  stdout?: string;
  stderr?: string;
  code?: unknown;
  killed?: boolean;
  signal?: string;
}

interface RunBase {
  stdout: string;
  stderr: string;
  code: number;
  command: string;
}

/**
 * The three things a failed spawn can mean. A binary that is not installed is
 * `unsupported`, not a failure of the project; a killed run is a failure the
 * caller can only fix by narrowing its scope; and any other exit is the
 * analyser answering on its own terms, with its output in hand.
 */
function outcomeOfFailure(
  failed: ExecFailure,
  base: RunBase,
  analyser: string,
): AnalyserRun {
  const carried = {
    ...base,
    stdout: failed.stdout ?? "",
    stderr: failed.stderr ?? "",
  };

  if (failed.code === "ENOENT")
    return {
      ...carried,
      status: "unsupported",
      error: `${analyser} is not installed or not on PATH — mu cannot read the project without it`,
    };

  if (failed.killed === true || typeof failed.signal === "string")
    return {
      ...carried,
      status: "failed",
      error: `${analyser} timed out after ${String(
        Math.round(ANALYSER_TIMEOUT_MS / 1000),
      )}s — narrow the scope it was pointed at`,
    };

  return {
    ...carried,
    code: typeof failed.code === "number" ? failed.code : 1,
    status: "ok",
    error: "",
  };
}

async function run(
  [binary, args]: readonly [string, readonly string[]],
  cwd: string,
  analyser: string,
): Promise<AnalyserRun> {
  const command = [binary, ...args].join(" ");
  const base: RunBase = { stdout: "", stderr: "", code: 1, command };

  try {
    const { stdout, stderr } = await pExecFile(binary, [...args], {
      cwd,
      maxBuffer: MAX_BUFFER,
      timeout: ANALYSER_TIMEOUT_MS,
      // The analyser is a foreign program with its own dependencies: mu's loader
      // paths must not answer for it.
      env: withoutMuLoaderEnv({ ...process.env, NO_COLOR: "1" }),
    });
    return { ...base, stdout, stderr, code: 0, status: "ok", error: "" };
  } catch (error: unknown) {
    return outcomeOfFailure(error as ExecFailure, base, analyser);
  }
}
