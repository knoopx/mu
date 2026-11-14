import { expect, test } from "bun:test";
import { PROJECT_ROWS_CAP } from "../constants";
import type { ProjectFolder } from "../types";
import {
  isCurrentProject,
  projectPlace,
  projectRows,
  projectStatusText,
  projectsEmptyText,
} from "./projectRows";

const folder = (
  path: string,
  sessions = 1,
  lastUsedMs = Date.now() - 3 * 60 * 60 * 1000,
): ProjectFolder => ({
  path,
  name: path.split("/").pop() ?? path,
  sessions,
  lastUsedMs,
});

const rowsOf = (
  projects: readonly ProjectFolder[],
  query = "",
  cwd = "/elsewhere",
) => projectRows(projects, query, cwd);

const option = (row: ReturnType<typeof rowsOf>[number]) => {
  expect(row.kind).toBe("option");
  return row.kind === "option" ? row : expect.unreachable();
};

test("a row names the folder, says where it sits, and counts its sessions", () => {
  const row = option(rowsOf([folder("/home/dev/Projects/mu", 7)])[0]);

  expect(row.label).toBe("mu");
  // The count is a conversation count, so it wears the conversation's mark and
  // not a clock: a clock beside a bare number reads as a time, and the row's
  // real time stands at the end of it.
  expect(row.figures?.[0]).toEqual({ icon: "chat", text: "7" });
  // The age is the row's other figure, and it is the row's whole argument for
  // being at the top.
  expect(row.figures?.[1]).toEqual({ icon: "history", text: "3h" });
});

const withHome = <T>(home: string, ask: () => T): T => {
  const previous = process.env.HOME;
  process.env.HOME = home;
  try {
    return ask();
  } finally {
    process.env.HOME = previous;
  }
};

test("a row is one line: the place stands beside the name, never under it", () => {
  const row = withHome("/home/dev", () =>
    option(rowsOf([folder("/home/dev/Projects/mu")])[0]),
  );

  expect(row.caption).toBeUndefined();
  expect(row.description).toBeUndefined();
  expect(row.place).toBe("~/Projects");
});

test("the place is the folder the project sits in, shortened to the home folder", () => {
  withHome("/home/dev", () => {
    const row = option(rowsOf([folder("/home/dev/Projects/gpuix-apps/mu")])[0]);
    // The last segment is already the row's name, so a path repeating it spends
    // the row's room saying nothing.
    expect(row.place).toBe("~/Projects/gpuix-apps");
    // A project sitting in the home folder says so with the one mark for it,
    // which is why the row can afford a path at all.
    expect(projectPlace("/home/dev/app")).toBe("~");
  });
});

test("the row for the folder this window is standing in is marked as here", () => {
  const projects = [folder("/home/dev/Projects/mu"), folder("/home/dev/app")];
  const rows = rowsOf(projects, "", "/home/dev/Projects/mu");

  expect(rows.map((row) => option(row).picked)).toEqual([true, false]);
  expect(
    isCurrentProject("/home/dev/Projects/mu/", "/home/dev/Projects/mu"),
  ).toBe(true);
});

test("a query narrows by name and by path, and a stale query leaves nothing", () => {
  const projects = [
    folder("/home/dev/Projects/mu"),
    folder("/home/dev/Projects/strudel"),
  ];

  expect(rowsOf(projects, "stru").map((row) => row.key)).toEqual([
    "/home/dev/Projects/strudel",
  ]);
  // The whole path is still what a query is matched against, even though the row
  // only prints the folder the name sits in.
  expect(rowsOf(projects, "dev/Projects").length).toBe(2);
  expect(rowsOf(projects, "nothing")).toEqual([]);
});

test("the list stops at the cap rather than running the band off the window", () => {
  const many = Array.from({ length: PROJECT_ROWS_CAP + 20 }, (_unused, index) =>
    folder(`/home/dev/p${index}`),
  );

  expect(rowsOf(many).length).toBe(PROJECT_ROWS_CAP);
});

test("the status line says what the store holds and what the query left", () => {
  expect(projectStatusText(26, "", 26)).toBe("26 projects on this machine");
  expect(projectStatusText(26, "gpuix", 3)).toBe("3 of 26 projects");
  // Past the cap the panel windows a newest-first slice, and says so.
  expect(projectStatusText(PROJECT_ROWS_CAP + 12, "", PROJECT_ROWS_CAP)).toBe(
    `${PROJECT_ROWS_CAP + 12} projects · newest first`,
  );
});

test("the panel says an empty store and an empty filter differently", () => {
  expect(projectsEmptyText("")).toBe("No project has a session yet");
  expect(projectsEmptyText("xyz")).toBe("No project matches");
});
