import type { PromptTemplate } from "@earendil-works/pi-coding-agent";
import { buildActivityModel, weeklyBuckets } from "adwaita-gpuix";
import {
  projectActivity,
  SPARKLINE_WEEKS,
  type ProjectSummaryModel,
} from "../../src/plugins/core/lib/project/projectSummary";
import { type Change } from "adwaita-gpuix";
import {
  pillsFromTemplates,
  type PromptPill,
} from "../../src/plugins/core/lib/project/promptTemplates";

const NOW = new Date("2026-11-07T16:49:00");
const AUTHOR = "knoopx@gmail.com";

function stamp(daysAgo: number, hour: number): string {
  const d = new Date(NOW.getTime() - daysAgo * 86_400_000);
  d.setHours(hour, 12, 0, 0);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const id = (seed: string, length: number, fill: string): string =>
  (seed + fill.repeat(length)).slice(0, length);

const commit = (seed: string): string => id(seed, 40, "0");

type Row = {
  change: string;
  commit: string;
  description: string;
  daysAgo: number;
  hour: number;
  parents: string[];
  bookmark?: string[];
  conflicts?: boolean;
  empty?: boolean;
  immutable?: boolean;
};

const MU_ROWS: Row[] = [
  {
    change: "uzywqlsx",
    commit: "0c9e27dd6b1a44f8",
    description: "chore(deps): pin @gpuix/react and adwaita-gpuix to 0.10.0",
    daysAgo: 212,
    hour: 11,
    parents: [],
    immutable: true,
  },
  {
    change: "sylqvxun",
    commit: "71b4a0c9f26d3815",
    description:
      "feat(window): boot the native window and the adwaita provider stack",
    daysAgo: 196,
    hour: 15,
    parents: ["0c9e27dd6b1a44f8"],
  },
  {
    change: "pzqkvmtw",
    commit: "d38a5c170b6e42cf",
    description:
      "feat(transcript): render the transcript state from the agent events",
    daysAgo: 171,
    hour: 10,
    parents: ["71b4a0c9f26d3815"],
  },
  {
    change: "ktxpwyqu",
    commit: "2f6c90ba7d15e834",
    description:
      "feat(composer): open a panel above the composer on a keystroke",
    daysAgo: 148,
    hour: 17,
    parents: ["d38a5c170b6e42cf"],
  },
  {
    change: "vmqzspkl",
    commit: "9b7e04cd5a128f63",
    description:
      "feat(composer): panel band maths — fit the list, cap it at the band",
    daysAgo: 121,
    hour: 13,
    parents: ["2f6c90ba7d15e834"],
    bookmark: ["origin/main"],
  },
  {
    change: "nqzxwvur",
    commit: "5a2d81e60c7b93fd",
    description:
      "feat(session): saved sessions per project, previewed on arrow",
    daysAgo: 100,
    hour: 9,
    parents: ["9b7e04cd5a128f63"],
  },
  {
    change: "yqzxtvmw",
    commit: "f20a6c39d87b514e",
    description:
      "wip(attachments): probe the EXIF orientation tag on pasted JPEGs",
    daysAgo: 97,
    hour: 21,
    parents: ["5a2d81e60c7b93fd"],
  },
  {
    change: "xuvznqpo",
    commit: "b73c2509ef14a8d6",
    description:
      "fix(attachments): honour the orientation tag in the photo strip",
    daysAgo: 95,
    hour: 18,
    parents: ["f20a6c39d87b514e"],
    bookmark: ["exif"],
    conflicts: true,
  },
  {
    change: "zlptqykn",
    commit: "e8147ba9c4056d12",
    description:
      "feat(search): web search through duckduckgo, results in the log",
    daysAgo: 96,
    hour: 19,
    parents: ["5a2d81e60c7b93fd"],
    bookmark: ["release"],
  },
  {
    change: "mtpqzvwk",
    commit: "77a0e2b41c6f0a53",
    description: "merge(exif): the orientation-aware strip into main",
    daysAgo: 93,
    hour: 11,
    parents: ["e8147ba9c4056d12", "b73c2509ef14a8d6"],
  },
  {
    change: "wqpsxvuz",
    commit: "1d4c90af73e2b586",
    description:
      "feat(attachments): paste images and keep the pixels in the transcript",
    daysAgo: 74,
    hour: 14,
    parents: ["77a0e2b41c6f0a53"],
  },
  {
    change: "rymktsvw",
    commit: "62e7f318d0a947ce",
    description:
      "feat(interaction): ask-user in the composer slot, hint bar as the footer",
    daysAgo: 52,
    hour: 16,
    parents: ["1d4c90af73e2b586"],
  },
  {
    change: "qkzplmwt",
    commit: "3b8d1ce08f5a76d9",
    description: "fix(vcs): keep the changes panel in one scroll pane",
    daysAgo: 34,
    hour: 12,
    parents: ["62e7f318d0a947ce"],
  },
  {
    change: "lpqzuxvk",
    commit: "a95d18c2f43b067e",
    description: "feat(composer): reverse search the prompt history on Ctrl+R",
    daysAgo: 17,
    hour: 18,
    parents: ["3b8d1ce08f5a76d9"],
  },
  {
    change: "vqkzwmtu",
    commit: "40e9b7d1a25c83f6",
    description: "fix(composer): window the panel list by cursor, not by fit",
    daysAgo: 8,
    hour: 20,
    parents: ["a95d18c2f43b067e"],
  },
  {
    change: "wtmzxstw",
    commit: "9f2c41a7e50b8c21",
    description: "fix(attachments): anchor the photo strip crop on the frame",
    daysAgo: 3,
    hour: 9,
    parents: ["40e9b7d1a25c83f6"],
  },
  {
    change: "tpqzuxvm",
    commit: "d52a70c8e319b4af",
    description:
      "fix(ask): reserve the hint strip in the ask panel's row count",
    daysAgo: 1,
    hour: 10,
    parents: ["9f2c41a7e50b8c21"],
    bookmark: ["main"],
  },
  {
    change: "spuqvwzw",
    commit: "2c1fe921a4d7e0b3",
    description: "(no description set)",
    daysAgo: 0.02,
    hour: 16,
    parents: ["d52a70c8e319b4af"],
    empty: true,
  },
];

function muHistory(): Change[] {
  return MU_ROWS.map((row) => ({
    change_id: id(row.change, 32, "x"),
    commit_id: commit(row.commit),
    description: row.description,
    author: AUTHOR,
    timestamp: stamp(row.daysAgo, row.hour),
    immutable: row.immutable === true,
    empty: row.empty === true,
    has_conflicts: row.conflicts === true,
    parents: row.parents.map(commit),
  })).reverse();
}

function bookmarksOf(changes: Change[]): Map<string, string[]> {
  const byCommit = new Map(changes.map((c) => [c.commit_id, c]));
  const map = new Map<string, string[]>();
  for (const row of MU_ROWS) {
    if (row.bookmark === undefined) continue;
    const found = byCommit.get(commit(row.commit));
    if (found !== undefined) map.set(found.commit_id, row.bookmark);
  }
  return map;
}

const RECENT_WINDOW = 13;

function project(
  name: string,
  over: Partial<ProjectSummaryModel> = {},
): ProjectSummaryModel {
  const changes = muHistory();
  const bookmarks = bookmarksOf(changes);
  const recent = changes
    .slice(0, RECENT_WINDOW)
    .map((c) => ({ change: c, bookmarks: bookmarks.get(c.commit_id) ?? [] }));
  const root = `~/Projects/gpuix-apps/${name}`;
  return {
    identity: {
      name,
      root,
      cwd: root,
      shortPath: root,
      group: `gpuix-apps/${name}`,
      isRepo: true,
      bookmark: "main",
    },
    meta: {
      language: "TypeScript",
      license: null,
      agentsFile: null,
      scripts: ["dev", "typecheck", "storybook"],
      trackedFiles: 155,
    },
    activity: {
      ...projectActivity(buildActivityModel(changes, { now: NOW }), bookmarks),
      recent,
    },
    weekly: weeklyBuckets(changes, SPARKLINE_WEEKS, NOW.getTime()),
    ...over,
  };
}

export const PROJECT_ACTIVE: ProjectSummaryModel = project("mu");

const SINGLE: Change[] = [
  {
    change_id: id("muuyzxwv", 32, "x"),
    commit_id: commit("a11e00079c4b2f60"),
    description: "(no description set)",
    author: AUTHOR,
    timestamp: stamp(0.01, 13),
    immutable: false,
    empty: true,
    has_conflicts: false,
    parents: [],
  },
];

export const PROJECT_SPARSE: ProjectSummaryModel = {
  identity: {
    name: "regex",
    root: "~/Projects/gpuix-apps/regex",
    cwd: "~/Projects/gpuix-apps/regex",
    shortPath: "~/Projects/gpuix-apps/regex",
    group: "gpuix-apps/regex",
    isRepo: true,
    bookmark: "no bookmark",
  },
  meta: {
    language: "TypeScript",
    license: null,
    agentsFile: null,
    scripts: ["dev", "typecheck"],
    trackedFiles: 18,
  },
  activity: projectActivity(
    buildActivityModel(SINGLE, { now: NOW }),
    new Map(),
  ),
  weekly: weeklyBuckets(SINGLE, SPARKLINE_WEEKS, NOW.getTime()),
};

export const PROJECT_PLAIN: ProjectSummaryModel = {
  ...PROJECT_SPARSE,
  identity: {
    name: "scratch",
    root: "~/scratch",
    cwd: "~/scratch",
    shortPath: "~/scratch",
    group: "scratch",
    isRepo: false,
    bookmark: "no bookmark",
  },
  meta: {
    language: "Shell",
    license: null,
    agentsFile: null,
    scripts: [],
    trackedFiles: 4,
  },
};

const template = (
  name: string,
  description: string,
  argumentHint: string,
): PromptTemplate => ({
  name,
  description,
  argumentHint,
  content: `${description}: $@`,
  sourceInfo: { source: "local" } as never,
  filePath: `~/.pi/agent/prompts/${name}.md`,
});

export const PROMPT_PILLS: PromptPill[] = pillsFromTemplates([
  template("gate", "Typecheck, then render the stories that changed", ""),
  template("capture", "Render one story and read the shot", "<Title/story>"),
  template("describe", "Write the change description for the working copy", ""),
  template("review", "Review the working copy diff", ""),
  template(
    "shots",
    "Compare a photo's frame with the tile it lands in",
    "<path>",
  ),
]);
