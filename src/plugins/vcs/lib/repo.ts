import { execFile, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import {
  BOOKMARK_LIST_ARGS,
  changedFiles,
  parseBookmarkList,
  runCli,
  sanitizeDescription,
  type CliMock,
  type CliResult,
} from "adwaita-gpuix";
import { type Bookmark, type Change, type FileChange } from "adwaita-gpuix";
import { SHORT_OP_ID } from "../constants";

const pExecFile = promisify(execFile);

const VCS = "jj";
const HUNK = "jj-hunk";

export const DEFAULT_CHANGE_REVSET = "ancestors(@, 50) ~ root()";

export type { CliResult, CliMock as VcsMock };

let workspaceRoot: string | null = null;

export function findWorkspaceRoot(cwd?: string): string {
  if (workspaceRoot !== null) return workspaceRoot;
  const start = cwd ?? process.cwd();
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, ".jj"))) {
      workspaceRoot = dir;
      return workspaceRoot;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      workspaceRoot = start;
      return workspaceRoot;
    }
    dir = parent;
  }
}

let mock: CliMock | null = null;

function setVcsMock(next: CliMock | null): void {
  mock = next;
  workspaceRoot = null;
}

function hasVcsMock(): boolean {
  return mock !== null;
}

export async function run(
  binary: string,
  args: string[],
  cwd?: string,
): Promise<CliResult> {
  return runCli(binary, args, cwd ?? findWorkspaceRoot(), mock ?? undefined);
}

export async function vcs(args: string[], cwd?: string): Promise<CliResult> {
  return run(VCS, args, cwd);
}

export async function vcsHunk(
  args: string[],
  cwd?: string,
): Promise<CliResult> {
  return run(HUNK, args, cwd);
}

async function vcsOk(args: string[], cwd?: string): Promise<string> {
  const res = await vcs(args, cwd);
  if (res.code !== 0)
    throw new Error(res.stderr.trim() || `${VCS} ${args.join(" ")} failed`);
  return res.stdout;
}

async function vcsQuiet(args: string[], cwd?: string): Promise<string | null> {
  const res = await vcs(args, cwd);
  return res.code !== 0 ? null : res.stdout;
}

export function failMessage(e: unknown): string {
  const text = e instanceof Error ? e.message : String(e);
  const first =
    text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .pop() ?? "";
  return first.length > 0 ? first : "Operation failed";
}

const CHANGES_TEMPLATE =
  'change_id ++ "\\t" ++ commit_id ++ "\\t" ++ author.name() ++ "\\t" ++ ' +
  'author.timestamp().format("%Y-%m-%d %H:%M") ++ "\\t" ++ ' +
  'coalesce(immutable, false) ++ "\\t" ++ description.first_line() ++ ' +
  '"\\t" ++ empty ++ "\\t" ++ conflict ++ "\\t" ++ ' +
  'parents.map(|p| p.commit_id()).join(",") ++ "\\n"';

export async function loadChanges(revsetStr: string): Promise<Change[]> {
  const revset =
    revsetStr.trim().length > 0 ? revsetStr : DEFAULT_CHANGE_REVSET;
  const out = await vcsOk([
    "log",
    "-r",
    revset,
    "--no-graph",
    "--color",
    "never",
    "-T",
    CHANGES_TEMPLATE,
  ]);
  const changes: Change[] = [];
  for (const line of out.split("\n")) {
    if (line.trim().length === 0) continue;
    const parts = line.split("\t");
    if (parts.length < 9) continue;
    const [
      change_id,
      commit_id,
      author,
      timestamp,
      immutable,
      desc,
      empty,
      has_conflicts,
      parentsRaw,
    ] = parts;
    changes.push({
      change_id: change_id ?? "",
      commit_id: commit_id ?? "",
      description: sanitizeDescription(desc ?? ""),
      author: (author ?? "").trim(),
      timestamp: timestamp ?? "",
      immutable: immutable === "true",
      empty: empty === "true",
      has_conflicts: has_conflicts === "true",
      parents: (parentsRaw ?? "")
        .split(",")
        .filter((p) => p.length > 0 && !/^0+$/.test(p)),
    });
  }
  return changes;
}

export async function getCurrentChangeId(): Promise<string | null> {
  const out = await vcsQuiet([
    "log",
    "-r",
    "@",
    "--no-graph",
    "--color",
    "never",
    "-T",
    'change_id ++ coalesce(if(divergent, "/" ++ stringify(change_offset)), "")',
  ]);
  const id = out?.trim() ?? "";
  return id.length > 0 ? id : null;
}

export async function listBookmarks(): Promise<Bookmark[]> {
  return parseBookmarkList(await vcsOk([...BOOKMARK_LIST_ARGS]));
}

export function bookmarkNamesFor(
  bookmarks: Bookmark[],
  changeId: string,
): string[] {
  return Array.from(
    new Set(
      bookmarks.filter((b) => b.change_id === changeId).map((b) => b.name),
    ),
  );
}

const filesCache = new Map<string, FileChange[]>();
const patchCache = new Map<string, string>();
const blobCache = new Map<string, Uint8Array | null>();

/** A picture the panel will paint: big files stay in the repo, not in memory. */
const MAX_BLOB_BYTES = 8 * 1024 * 1024;

function clearPatchCaches(): void {
  filesCache.clear();
  patchCache.clear();
  blobCache.clear();
}

async function cacheKey(changeId: string): Promise<string> {
  const head =
    (await vcsQuiet([
      "operation",
      "log",
      "-n",
      "1",
      "--no-graph",
      "--color",
      "never",
      "-T",
      'id ++ "\\n"',
    ])) ?? "";
  return `${changeId}:${head.trim()}`;
}

export async function loadChangedFiles(
  changeId: string,
): Promise<FileChange[]> {
  const key = await cacheKey(changeId);
  const cached = filesCache.get(key);
  if (cached !== undefined) return cached;

  const files = await changedFiles(
    changeId,
    async (args) => (await vcs(["diff", "--git", ...args])).stdout,
  );
  filesCache.set(key, files);
  return files;
}

export async function getRawDiff(
  changeId: string,
  filePath?: string,
): Promise<string> {
  const key = `${await cacheKey(changeId)}${filePath === undefined ? "" : `:${filePath}`}`;
  const cached = patchCache.get(key);
  if (cached !== undefined) return cached;
  const args = ["diff", "--git", "-r", changeId];
  if (filePath !== undefined) args.push(filePath);
  const out = (await vcs(args)).stdout;
  patchCache.set(key, out);
  return out;
}

/**
 * The bytes of one file of a change: at the change itself, or at its first
 * parent.
 *
 * A patch is text and `run` decodes stdout as text, which would eat a picture,
 * so a picture is read from jj's own content store, binary-safe. Null means jj
 * had no such file there — an added picture has no before, a deleted picture no
 * after — or that it is too big to hand over.
 */
export async function loadFileBytes(
  changeId: string,
  filePath: string,
  at: "change" | "parent",
): Promise<Uint8Array | null> {
  if (hasVcsMock()) return null;

  const revision = at === "change" ? changeId : await parentChangeId(changeId);
  if (revision === null) return null;

  const key = `${await cacheKey(changeId)}:${revision}:${filePath}`;
  const cached = blobCache.get(key);
  if (cached !== undefined) return cached;

  let bytes: Uint8Array | null = null;
  try {
    const { stdout } = await pExecFile(
      VCS,
      ["file", "show", "-r", revision, filePath],
      {
        cwd: findWorkspaceRoot(),
        maxBuffer: MAX_BLOB_BYTES,
        encoding: "buffer",
      },
    );
    if (stdout.length > 0 && stdout.length <= MAX_BLOB_BYTES) bytes = stdout;
  } catch {
    bytes = null;
  }
  blobCache.set(key, bytes);
  return bytes;
}

function hunkToolAvailable(): boolean {
  if (mock !== null) return true;
  try {
    execSync(`command -v ${HUNK}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export interface HunkRange {
  start: number;
  lines: number;
}

export interface HunkBlock {
  index: number;
  id: string;
  type: string;
  removed: string;
  added: string;
  before: HunkRange;
  after: HunkRange;
}

export interface FileHunks {
  path: string;
  status: string;
  hunks: HunkBlock[];
}

export interface HunkListResult {
  files: FileHunks[];
}

async function loadHunks(changeId: string): Promise<HunkListResult> {
  const res = await vcsHunk(["list", "--format", "json", "-r", changeId]);
  if (res.code !== 0)
    throw new Error(res.stderr.trim() || "jj-hunk list failed");
  return JSON.parse(res.stdout) as HunkListResult;
}

async function runHunkSpec(
  changeId: string,
  selections: Array<{ file_path: string; hunk_id: string }>,
  defaultAction: "keep" | "reset",
  message: string,
): Promise<void> {
  const { tmpdir } = await import("node:os");
  const { writeFileSync, rmSync } = await import("node:fs");
  const files: Record<string, { ids: string[] }> = {};
  for (const sel of selections)
    (files[sel.file_path] ??= { ids: [] }).ids.push(sel.hunk_id);
  const specPath = join(tmpdir(), `mu-hunk-spec-${process.pid}.json`);
  writeFileSync(specPath, JSON.stringify({ files, default: defaultAction }));
  try {
    const res = await vcsHunk([
      "split",
      "-r",
      changeId,
      "-f",
      specPath,
      message,
    ]);
    if (res.code !== 0) throw new Error(res.stderr.trim());
  } finally {
    rmSync(specPath, { force: true });
  }
}

async function splitSelectedHunks(
  changeId: string,
  selections: Array<{ file_path: string; hunk_id: string }>,
): Promise<string> {
  await runHunkSpec(
    changeId,
    selections,
    "keep",
    `Split selected hunks from change ${changeId.slice(0, 8)}`,
  );
  return `Split ${selections.length} hunk(s) from ${changeId.slice(0, 8)}`;
}

async function discardSelectedHunks(
  changeId: string,
  selections: Array<{ file_path: string; hunk_id: string }>,
): Promise<string> {
  await runHunkSpec(changeId, selections, "reset", "Discard selected hunks");
  return `Discarded ${selections.length} hunk(s)`;
}

export async function newChange(changeId: string): Promise<string> {
  await vcsOk(["new", changeId]);
  return `Created new change on ${changeId.slice(0, 8)}`;
}

export async function editChange(changeId: string): Promise<string> {
  await vcsOk(["edit", changeId]);
  return `Set working copy to ${changeId.slice(0, 8)}`;
}

export async function abandonChange(changeId: string): Promise<string> {
  await vcsOk(["abandon", changeId]);
  return `Abandoned change ${changeId.slice(0, 8)}`;
}

async function parentChangeId(changeId: string): Promise<string | null> {
  const out = await vcsQuiet([
    "log",
    "-r",
    changeId,
    "--no-graph",
    "--color",
    "never",
    "-T",
    'parents.map(|p| p.change_id()).join(",")',
  ]);
  const first = out?.split(",")[0]?.trim();
  return first !== undefined && first.length > 0 ? first : null;
}

export async function squashChange(changeId: string): Promise<string> {
  const parent = await parentChangeId(changeId);
  if (parent === null) throw new Error("Cannot squash root change (no parent)");
  await vcsOk(["squash", "-u", "-r", changeId]);
  return "Squashed change into parent";
}

export async function revertChange(changeId: string): Promise<string> {
  await vcsOk(["revert", changeId]);
  return `Reverted change ${changeId.slice(0, 8)}`;
}

/**
 * Rewinding the repo itself, which is what jj's operation log is for.
 *
 * These three are the op log panel's keys, and they move the whole workspace,
 * not one change — which is why the panel says what it did and re-reads every
 * list after them. jj names the operation it restored to in its own words.
 */
export async function undoOperation(): Promise<string> {
  await vcsOk(["undo"]);
  return "Undid the last operation";
}

export async function redoOperation(): Promise<string> {
  await vcsOk(["redo"]);
  return "Redid the last undone operation";
}

export async function restoreOperation(opId: string): Promise<string> {
  await vcsOk(["op", "restore", opId]);
  return `Restored to operation ${opId.slice(0, SHORT_OP_ID)}`;
}

export async function restoreFile(
  changeId: string,
  filePath: string,
): Promise<string> {
  await vcsOk(["restore", "--changes-in", changeId, filePath]);
  return `Discarded changes in '${filePath}'`;
}

export async function setBookmarkToChange(
  bookmarkName: string,
  changeId: string,
): Promise<string> {
  const name = bookmarkName.split("@")[0]?.trim() ?? "";
  if (name.length === 0) throw new Error("Bookmark name is required");
  await vcsOk(["bookmark", "set", "--allow-backwards", name, "-r", changeId]);
  return `Set bookmark '${name}' to ${changeId.slice(0, 8)}`;
}

export async function forgetBookmark(bookmarkRef: string): Promise<string> {
  const name = bookmarkRef.split("@")[0]?.trim() ?? "";
  if (name.length === 0) return "";
  await vcsOk(["bookmark", "forget", "--include-remotes", name]);
  return `Forgot bookmark '${name}'`;
}

export async function pushBookmarks(names: string[]): Promise<string> {
  for (const name of names) await vcsOk(["git", "push", "-b", name]);
  return `Pushed ${names.length} bookmark(s)`;
}

