/**
 * No two stories may render the same screen.
 *
 * A screen is identified by the three things a story actually sets: the
 * transcript it puts in the log, the composer panel it opens, and the theme
 * stage it paints under. Two stories sharing all three are the same PNG twice;
 * sharing the transcript alone is what made 12 of 20 README images one
 * conversation with a different panel bolted on.
 *
 * `bun .storybook/checkUnique.ts` — exits 1 and prints the offenders.
 */
import { readdirSync, readFileSync } from "node:fs";

type Row = {
  story: string;
  items: string;
  mode: string;
  theme: string;
};

const storyFiles = readdirSync("stories")
  .filter((f) => f.endsWith(".stories.tsx"))
  .sort();

const rows: Row[] = [];

for (const file of storyFiles) {
  const source = readFileSync(`stories/${file}`, "utf8");
  // One block per exported story; `export const <name>` or `export function <name>`.
  const blocks = source.split(/(?=^export (?:const|function) )/m).filter((b) => /^export /.test(b));
  for (const block of blocks) {
    const name = block.match(/^export (?:const|function) (\w+)/m)?.[1] ?? "?";
    // A chrome helper may wrap a chat() call; scan the whole block, and a story
    // without its own chat() call borrows the file-level helper (handled below).
    // Fixture identifiers, the panel opened, and the theme painted — read from
    // the whole block so a nested object or a wrapper helper cannot hide one.
    const items = [...block.matchAll(/\b([A-Z][A-Z0-9_]*_(?:ITEMS|TURN|ROWS|SESSION))\b/g)]
      .map((m) => m[1])
      .filter((id) => !id.endsWith("_ROWS") || /model|thinking|session|path|change|theme|accent/i.test(id))
      .filter((id, i, all) => all.indexOf(id) === i);
    const mode =
      block.match(/pickMode\("(\w+)"\)/)?.[1] ??
      block.match(/target:\s*"(\w+)"/)?.[1] ??
      block.match(/initialMode:\s*([a-zA-Z_]\w*)/)?.[1] ??
      "none";
    rows.push({
      story: `${file.replace(".stories.tsx", "")}/${name}`,
      items: items.join(","),
      mode,
      theme:
        block.match(/themeStage\("(\w+)"/)?.[1] ??
        block.match(/themeStory\("\w+", "(\w+)"/)?.[1] ??
        "default",
    });
  }
}

const byScreen = new Map<string, string[]>();
const byTranscript = new Map<string, string[]>();
for (const row of rows) {
  if (!row.items) continue;
  const screen = `${row.items} + ${row.mode} + ${row.theme}`;
  byScreen.set(screen, [...(byScreen.get(screen) ?? []), row.story]);
  for (const item of row.items.split(",")) {
    byTranscript.set(item, [...(byTranscript.get(item) ?? []), row.story]);
  }
}

const photoStripOk = new Set(["Chat/session", "Sessions/list"]);

let failures = 0;
for (const [screen, stories] of byScreen) {
  if (stories.length > 1) {
    failures++;
    console.log(`same screen: ${screen}\n  ${stories.join("\n  ")}`);
  }
}
for (const [items, stories] of byTranscript) {
  // A transcript may appear twice when the screen around it differs — the Looks
  // row is one session in three themes on purpose, and `Sessions/list` previews
  // the hero's session in another session's row. It may not appear twice in the
  // same panel under the same theme, which is the first check above.
  const panelSame = new Set(
    rows.filter((r) => r.items.split(",").includes(items)).map((r) => r.mode),
  ).size === 1;
  const themeSame = new Set(
    rows.filter((r) => r.items.split(",").includes(items)).map((r) => r.theme),
  ).size === 1;
  if (stories.length > 1 && panelSame && themeSame && !stories.every((s) => photoStripOk.has(s))) {
    failures++;
    console.log(`shared transcript ${items}:\n  ${stories.join("\n  ")}`);
  }
}

console.log(
  `\n${rows.length} stories, ${byTranscript.size} transcripts — ${failures === 0 ? "all distinct" : `${failures} collision(s)`}`,
);
process.exit(failures === 0 ? 0 : 1);
