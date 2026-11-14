/**
 * What `Load(path)` answers.
 *
 * The seam is the folder, not the disk: every case writes its own file in a temp
 * directory and hands `loadFile` that directory as the window's cwd, so the
 * suite reads real bytes and never reaches the project it runs in.
 */

import { expect, test, describe } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  MAX_LOAD_BYTES,
  loadFile,
  loadKindOf,
  parseDelimited,
  readFileLines,
  invalidateLoads,
} from "./load";
import { beginLoadReport, loadValue, takeLoadReports } from "./source";

const folder = mkdtempSync(join(tmpdir(), "mu-load-"));

const file = (name: string, body: string): string => {
  writeFileSync(join(folder, name), body, "utf8");
  return name;
};

describe("the kind a name is read as", () => {
  test("by its own extension", () => {
    expect(loadKindOf("out/report.csv")).toBe("csv");
    expect(loadKindOf("out/report.TSV")).toBe("tsv");
    expect(loadKindOf("events.jsonl")).toBe("jsonl");
    expect(loadKindOf("package.json")).toBe("json");
    expect(loadKindOf("README.md")).toBe("text");
    expect(loadKindOf("no-extension")).toBe("text");
  });
});

describe("a delimited file", () => {
  test("arrives as objects keyed by its header row", () => {
    expect(
      parseDelimited("file,lines\nsrc/a.ts,164\nsrc/b.ts,44\n", ","),
    ).toEqual([
      { file: "src/a.ts", lines: "164" },
      { file: "src/b.ts", lines: "44" },
    ]);
  });

  test("a quoted cell keeps the separator it holds", () => {
    expect(parseDelimited('name,note\n"a, b","say ""hi"""\n', ",")).toEqual([
      { name: "a, b", note: 'say "hi"' },
    ]);
  });

  test("a header cell with no name is still a column", () => {
    expect(parseDelimited("a,,c\n1,2,3\n", ",")).toEqual([
      { a: "1", column2: "2", c: "3" },
    ]);
  });
});

describe("loadFile", () => {
  test("a csv becomes the rows a Table draws", () => {
    const name = file("rows.csv", "file,lines\nsrc/a.ts,164\nsrc/b.ts,44\n");
    const read = loadFile(folder, name);
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.value).toBeInstanceOf(Array);
  });

  test("a json file becomes its own value", () => {
    const name = file("shape.json", JSON.stringify({ total: 12, ok: true }));
    const read = loadFile(folder, name);
    expect(read.ok && read.value).toEqual({ total: 12, ok: true });
  });

  test("a jsonl file becomes one value per line", () => {
    const name = file("log.jsonl", '{"at":1}\n{"at":2}\nnot json\n');
    const read = loadFile(folder, name);
    expect(read.ok && read.value).toEqual([{ at: 1 }, { at: 2 }, "not json"]);
  });

  test("a text file arrives as text", () => {
    const name = file("notes.md", "# Notes\n\nA line.\n");
    const read = loadFile(folder, name);
    expect(read.ok && typeof read.value === "string").toBe(true);
  });

  test("a name that walks out of the folder is refused", () => {
    const read = loadFile(folder, "../outside.json");
    expect(read.ok).toBe(false);
  });

  test("a file that is not there says so in the program's words", () => {
    const read = loadFile(folder, "gone.csv");
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.error).toContain("gone.csv");
  });

  test("a file over the bound is refused rather than drawn", () => {
    const name = file("huge.txt", "x".repeat(MAX_LOAD_BYTES + 10));
    const read = loadFile(folder, name);
    expect(read.ok).toBe(false);
    if (!read.ok) expect(read.error).toContain("over what a program reads");
  });

  test("a file rewritten on disk is read again", () => {
    const name = file("moving.json", JSON.stringify({ v: 1 }));
    const first = loadFile(folder, name);
    writeFileSync(join(folder, name), JSON.stringify({ v: 2 }), "utf8");
    invalidateLoads();
    const second = loadFile(folder, name);
    expect(first.ok && first.value).toEqual({ v: 1 });
    expect(second.ok && second.value).toEqual({ v: 2 });
  });
});

describe("readFileLines", () => {
  test("answers a 1-based range and says how long the file is", () => {
    const name = file("ten.txt", "a\nb\nc\nd\ne\n");
    const read = readFileLines(folder, name, 2, 4);
    expect(read.ok && read.lines).toEqual(["b", "c", "d"]);
    expect(read.ok && read.total).toBe(6);
    expect(read.ok && read.last).toBe(4);
  });

  test("a range past the end of the file comes back short, not empty", () => {
    const name = file("short.txt", "a\nb\n");
    const read = readFileLines(folder, name, 2, 50);
    expect(read.ok && read.lines).toEqual(["b", ""]);
  });
});

describe("what a program sees", () => {
  test("a value reaches the component", () => {
    const name = file("feed.json", JSON.stringify([1, 2, 3]));
    expect(loadValue(folder, name)).toEqual([1, 2, 3]);
  });

  test("a read that found nothing leaves a note the program can print", () => {
    beginLoadReport();
    expect(loadValue(folder, "nowhere.csv")).toBeNull();
    const notes = takeLoadReports();
    expect(notes.length).toBe(1);
    expect(notes[0]).toContain("nowhere.csv");
  });

  test("a note is drained once, so a repaint does not repeat it", () => {
    beginLoadReport();
    loadValue(folder, "also-nowhere.csv");
    expect(takeLoadReports().length).toBe(1);
    expect(takeLoadReports().length).toBe(0);
  });
});
