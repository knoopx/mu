/**
 * The nine GitHub tools, and the nine shapes they answer with.
 *
 * A record is a record's UI — its figures on the header, its prose in the card.
 * A folder is a tree. A file is its text, bare, with its length said once on the
 * header. A pull request is a change: state word, branches, files, the histogram
 * of what each moved. A failure is one line of reason and nothing else.
 *
 * Every claim here is about what the row prints and how many times it prints it.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { logScene } from "../stage/log";
import {
  GITHUB_COMMIT_ITEM,
  GITHUB_FILE_ITEM,
  GITHUB_ISSUE_ITEM,
  GITHUB_PR_ITEM,
  GITHUB_RELEASES_ITEM,
  GITHUB_REPO_ITEM,
  GITHUB_SEARCH_ITEM,
  GITHUB_TREE_ITEM,
  GITHUB_USER_ITEM,
  GITHUB_FAILED_ITEM,
} from "../fixtures/github";

afterEach(releaseAll);

describe("a repository, read", () => {
  test("its figures ride the header and its description is the card", async () => {
    const screen = await logScene({ items: [GITHUB_REPO_ITEM] });
    expect(screen.mentions("gpuix/adwaita-gpuix")).toBe(1);
    expect(screen.says("TypeScript")).toBe(true);
    expect(screen.says("812")).toBe(true);
    expect(screen.says("6 Nov")).toBe(true);
    expect(screen.says("The Adwaita widget set, drawn on the GPU.")).toBe(true);
    // The card never restates what the header already named.
    expect(screen.mentions("github-repo")).toBe(1);
  });

  test("a folder answers as a tree, not as a second list of paths", async () => {
    const screen = await logScene({ items: [GITHUB_TREE_ITEM] });
    expect(screen.ink("src/lib in gpuix/adwaita-gpuix").text).toContain(
      "src/lib",
    );
    expect(screen.says("theme")).toBe(true);
    expect(screen.says("measure.ts")).toBe(true);
    // A folder row prints no path line of its own under the header.
    expect(screen.mentions("src/lib in gpuix/adwaita-gpuix")).toBe(1);
  });

  test("no entry is drawn inside another — the listing is the one level it read", async () => {
    const screen = await logScene({ items: [GITHUB_TREE_ITEM] });
    // GitHub names the entries in one alphabetical run and brings no folder with
    // its contents, so an open mark over a folder is read as nesting that the
    // answer never said. The draw says it plainly instead: folders grouped above
    // the files, every row standing at the same left edge.
    const painted = screen.painted();
    const at = (name: string) => painted.indexOf(name);
    expect(at("theme")).toBeGreaterThanOrEqual(0);
    expect(at("theme")).toBeLessThan(at("measure.ts"));
    expect(at("tokens")).toBeLessThan(at("measure.ts"));
    expect(at("tokens")).toBeLessThan(at("types.ts"));

    const edges = ["theme", "tokens", "measure.ts", "types.ts"].map(
      (name) => screen.ink(name).x,
    );
    expect(new Set(edges).size).toBe(1);
  });

  test("a file says its length on the header and stands bare under it", async () => {
    const screen = await logScene({ items: [GITHUB_FILE_ITEM] });
    const header = screen.ink("src/lib/tokens/rows.ts in gpuix/adwaita-gpuix");
    expect(header.text).toContain("12 of 48 lines");
    expect(header.text).toContain("5 KB");
    // The text itself is painted by the native code element: one header, one
    // body, no card that repeats the path.
    expect(
      screen.mentions("src/lib/tokens/rows.ts in gpuix/adwaita-gpuix"),
    ).toBe(1);
    expect(screen.codeMentions("export const ROW_HEIGHT = 24;")).toBe(1);
    expect(screen.codeMentions("ROW_HEIGHT")).toBeGreaterThanOrEqual(3);
  });

  test("a path the repository does not have is one line of reason", async () => {
    const screen = await logScene({ items: [GITHUB_FAILED_ITEM] });
    expect(screen.says("no such repository, ref, path, number or tag")).toBe(
      true,
    );
    expect(screen.mentions("src/lib/rowHeight.ts in gpuix/adwaita-gpuix")).toBe(
      1,
    );
    // Nothing is drawn where the text would have been.
    expect(screen.codeMentions("export const")).toBe(0);
  });
});

describe("a change, read", () => {
  test("a pull request says its state on the header and its files in the card", async () => {
    const screen = await logScene({ items: [GITHUB_PR_ITEM] });
    const header = screen.ink("#418 in gpuix/adwaita-gpuix");
    expect(header.text).toContain("Let a widget budget its own row slots");
    expect(header.text).toContain("merged");
    expect(screen.says("row-slots → main")).toBe(true);
    // Each file is one row, and the pair of figures it moved stands beside it.
    expect(screen.says("src/components/List.tsx")).toBe(true);
    expect(screen.says("+38")).toBe(true);
    expect(screen.says("-21")).toBe(true);
    expect(
      screen.says(
        "A widget that needed a taller row was writing its own height",
      ),
    ).toBe(true);
  });

  test("a commit is the change it made, file by file", async () => {
    const screen = await logScene({ items: [GITHUB_COMMIT_ITEM] });
    const header = screen.ink("8f3c21a in gpuix/adwaita-gpuix");
    expect(header.text).toContain(
      "theme: drive the whole accent ramp from one colour",
    );
    expect(header.text).toContain("3 files");
    expect(screen.says("src/theme/adwaita.ts")).toBe(true);
    expect(screen.says("+41")).toBe(true);
    expect(screen.codeMentions("hand-picked hex")).toBe(1);
  });
});

describe("the parts of a project that are not records", () => {
  test("a search is a hit list where every hit wears the mark of what it is", async () => {
    const screen = await logScene({ items: [GITHUB_SEARCH_ITEM] });
    const header = screen.ink("“gpuix” repositories");
    expect(header.text).toContain("59 matched");
    expect(screen.says("gpuix/gpuix")).toBe(true);
    expect(
      screen.says("GPU-rendered desktop applications, written in Rust"),
    ).toBe(true);
    // A star count says what it counts, once per hit.
    expect(screen.countOf("stars")).toBe(3);
    expect(screen.says("1,204")).toBe(true);
  });

  test("a release list reads as a track of dates", async () => {
    const screen = await logScene({ items: [GITHUB_RELEASES_ITEM] });
    const rowOf = (tag: string): number => {
      const rows = screen.inkOf("").filter((entry) => entry.text === tag);
      expect(rows.length).toBe(1);
      return rows[0]!.y;
    };
    const tags = ["v0.14.0", "v0.14.0-rc1", "v0.13.2", "v0.13.0"].map(rowOf);
    for (let i = 1; i < tags.length; i++)
      expect(tags[i]!).toBeGreaterThan(tags[i - 1]!);
    expect(screen.says("4 Nov")).toBe(true);
  });

  test("an issue is the thread it is: the report, then the replies in order", async () => {
    const screen = await logScene({ items: [GITHUB_ISSUE_ITEM] });
    const header = screen.ink("#391 in gpuix/adwaita-gpuix");
    expect(header.text).toContain(
      "ContributionHeatmap cells ignore the accent ramp",
    );
    expect(header.text).toContain("open");
    expect(screen.says("bug, theme")).toBe(true);
    const replies = [
      "The cells read `t.color.accent.tint` once at build time",
      "Confirmed — same root as the code palette.",
      "Still wrong on nightsky: the empty cells are the card colour",
    ].map((reply) => screen.ink(reply).y);
    for (let i = 1; i < replies.length; i++)
      expect(replies[i]!).toBeGreaterThan(replies[i - 1]!);
  });

  test("a profile is a face and a handful of counts", async () => {
    const screen = await logScene({ items: [GITHUB_USER_ITEM] });
    expect(screen.mentions("github-user")).toBe(1);
    expect(screen.inkOf("").length).toBeGreaterThan(4);
  });
});
