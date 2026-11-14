import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PROJECTS_STORE_ENV } from "../constants";
import {
  decodeSessionFolder,
  projectsFromSessions,
  scanProjectFolders,
  sessionsRoot,
} from "./projectStore";

/**
 * A fake session store: the folders pi writes, with the paths its own headers
 * name, so the walk is graded against the shape of the real one rather than a
 * mock of `fs`.
 */
function store(): { root: string; cwd: (name: string) => string } {
  const root = mkdtempSync(join(tmpdir(), "mu-projects-"));
  return {
    root,
    cwd: (name: string): string => {
      const path = join(root, "work", name);
      mkdirSync(path, { recursive: true });
      return path;
    },
  };
}

function session(
  root: string,
  folder: string,
  file: string,
  cwd: string | undefined,
  touchedSeconds: number,
): void {
  const dir = join(root, folder);
  mkdirSync(dir, { recursive: true });
  const header: Record<string, unknown> = {
    type: "session",
    id: file,
    version: 3,
    timestamp: new Date(touchedSeconds * 1000).toISOString(),
  };
  if (cwd !== undefined) header.cwd = cwd;
  const path = join(dir, `${file}.jsonl`);
  writeFileSync(path, `${JSON.stringify(header)}\n`);
  utimesSync(path, touchedSeconds, touchedSeconds);
}

test("a session folder is a project, named by the cwd its newest header says", () => {
  const { root, cwd } = store();
  const one = cwd("one");
  session(root, "--work-one--", "old", one, 1_000);
  session(root, "--work-one--", "new", one, 2_000);

  const projects = projectsFromSessions(root);

  expect(projects.length).toBe(1);
  expect(projects[0]?.path).toBe(one);
  expect(projects[0]?.name).toBe("one");
  // The folder holds two sessions and was last written at the newer one's stamp.
  expect(projects[0]?.sessions).toBe(2);
  expect(projects[0]?.lastUsedMs).toBe(2_000_000);
});

test("the newest session decides the recency, and the list is newest first", () => {
  const { root, cwd } = store();
  const old = cwd("old");
  const recent = cwd("recent");
  session(root, "--work-old--", "a", old, 1_000);
  session(root, "--work-old--", "b", old, 1_500);
  session(root, "--work-recent--", "c", recent, 5_000);

  expect(projectsFromSessions(root).map((p) => p.name)).toEqual([
    "recent",
    "old",
  ]);
});

test("a folder with no session in it is not a project", () => {
  const { root, cwd } = store();
  cwd("empty");
  mkdirSync(join(root, "--work-empty--"), { recursive: true });
  session(root, "--work-real--", "a", cwd("real"), 1_000);

  expect(projectsFromSessions(root).map((p) => p.name)).toEqual(["real"]);
});

test("a project that was deleted off the disk is not offered", () => {
  const { root } = store();
  session(root, "--gone--", "a", join(root, "gone"), 1_000);
  session(root, "--still-here--", "a", join(root, "still-here"), 900);
  mkdirSync(join(root, "still-here"), { recursive: true });

  expect(projectsFromSessions(root).map((p) => p.name)).toEqual(["still-here"]);
});

test("two folders spelling one path are one project with both histories", () => {
  const { root, cwd } = store();
  const path = cwd("shared");
  session(root, "--work-shared--", "a", path, 1_000);
  session(root, "--work-shared-copy--", "b", path, 3_000);

  const projects = projectsFromSessions(root);
  expect(projects.length).toBe(1);
  expect(projects[0]?.sessions).toBe(2);
  expect(projects[0]?.lastUsedMs).toBe(3_000_000);
});

test("a header with no cwd falls back to the folder's own spelling", () => {
  const { root } = store();
  // The encoding is of a rooted path, so the answer is `/tmp/app/plain` — a path
  // outside the store, which is why `exists` is asked rather than assumed.
  session(root, "--tmp-app-plain--", "a", undefined, 1_000);

  const projects = projectsFromSessions(root, () => true);
  expect(projects.map((p) => p.path)).toEqual(["/tmp/app/plain"]);
  expect(projects[0]?.name).toBe("plain");
});

test("a path the disk no longer holds is dropped, whatever the header said", () => {
  const { root, cwd } = store();
  session(root, "--work-vanished--", "a", cwd("vanished"), 1_000);

  expect(projectsFromSessions(root, () => false)).toEqual([]);
});

test("a store that is not there answers with nothing rather than a crash", () => {
  expect(projectsFromSessions(join(tmpdir(), "mu-no-such-store"))).toEqual([]);
});

test("one variable points the panel at another store, and only the panel reads it", () => {
  const { root, cwd } = store();
  session(root, "--work-named--", "a", cwd("named"), 1_000);
  const env = { [PROJECTS_STORE_ENV]: root } as NodeJS.ProcessEnv;

  expect(sessionsRoot(env)).toBe(root);
  expect(scanProjectFolders(env).map((project) => project.path)).toEqual([
    cwd("named"),
  ]);
  // With nothing named, the store is pi's own — which is the one thing this test
  // can say without walking a real one: the variable decides, and the folder
  // inside it is pi's own name for it.
  expect(sessionsRoot({})).toContain("sessions");
});

test("the folder name decodes only where it cannot lie", () => {
  expect(decodeSessionFolder("--home-me-Projects-app--")).toBe(
    "/home/me/Projects/app",
  );
  expect(decodeSessionFolder("--")).toBe(null);
});
