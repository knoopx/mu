import { describe, expect, test } from "bun:test";

import { ascendRow, descendRow, indexRows, type TreeRow } from "./sessionTree";

/**
 * A model's rows, in the order the panel draws them.
 *
 * `root` has two children, and the first of them opens a chain of rows with one
 * child each down to `deep` — the shape a branch is walked through.
 */
const row = (id: string, parentId: string | null): TreeRow => ({
  id,
  parentId,
  role: "user",
  icon: "person",
  text: id,
  meta: "",
  active: false,
  leaf: false,
  search: id,
});

const rows: TreeRow[] = [
  row("root", null),
  row("branch", "root"),
  row("only", "branch"),
  row("deep", "only"),
  row("sibling", "root"),
];

const index = indexRows(rows);

describe("indexRows", () => {
  test("every row is numbered, and every parent holds its children in order", () => {
    expect(index.at.get("deep")).toBe(3);
    expect(index.childrenOf.get("root")).toEqual(["branch", "sibling"]);
    expect(index.childrenOf.get("branch")).toEqual(["only"]);
  });
});

describe("descendRow", () => {
  test("a fork steps to its first child", () => {
    expect(descendRow(rows, index, 0)).toBe(1);
  });

  test("a run of one-child rows is one jump, down to the leaf", () => {
    expect(descendRow(rows, index, 1)).toBe(3);
  });

  test("a leaf stays put", () => {
    expect(descendRow(rows, index, 3)).toBe(3);
    expect(descendRow(rows, index, 4)).toBe(4);
  });

  test("a cursor on no row at all moves nowhere", () => {
    expect(descendRow(rows, index, 9)).toBeUndefined();
  });
});

describe("ascendRow", () => {
  test("up from a leaf stops at the nearest ancestor with a sibling still below", () => {
    expect(ascendRow(rows, index, 3)).toBe(1);
  });

  test("an ancestor already read past stands above the cursor, so the walk goes on", () => {
    // The cursor stands on `branch` itself: its parent has a sibling, but that
    // sibling sits below the cursor and has already been read, so the walk keeps
    // going up to the top of the branch rather than circling the same row.
    expect(ascendRow(rows, index, 1)).toBe(0);
  });

  test("the top of the tree answers with the row it stands on", () => {
    expect(ascendRow(rows, index, 0)).toBe(0);
  });

  test("a cursor on no row at all moves nowhere", () => {
    expect(ascendRow(rows, index, 9)).toBeUndefined();
  });
});
