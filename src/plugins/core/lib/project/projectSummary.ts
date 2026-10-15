import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, dirname, join, relative } from "node:path";

import type { VcsMock } from "../../../vcs/lib/repo";
import {
  bookmarksByChange,
  findWorkspaceRoot,
  listBookmarks,
  loadChanges,
  run,
} from "../../../vcs/lib/repo";
import type { Change } from "../../../vcs/types";
import { NO_BOOKMARK, shortenPath } from "../workspace/workspaceStatus";
import {
  buildActivityModel,
  parseTimestamp,
  weeklyBuckets,
  type ActivityModel,
} from "./activity";

export const SPARKLINE_WEEKS = 12;

export const SUMMARY_REVSET = "::";

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".jj",
  "dist",
  "build",
  "target",
  ".venv",
  "venv",
  "hf-cache",
  ".next",
  "out",
  "coverage",
]);

const LANG_EXT: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  mts: "TypeScript",
  cts: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  rs: "Rust",
  py: "Python",
  go: "Go",
  nix: "Nix",
  c: "C/C++",
  cc: "C/C++",
  cpp: "C/C++",
  cu: "CUDA",
  h: "C/C++",
  hpp: "C/C++",
  zig: "Zig",
  java: "Java",
  kt: "Kotlin",
  swift: "Swift",
  sh: "Shell",
  nu: "Nushell",
  lua: "Lua",
  rb: "Ruby",
  php: "PHP",
  svelte: "Svelte",
  vue: "Vue",
  css: "CSS",
  scss: "CSS",
  md: "Markdown",
};

export const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Rust: "#dea584",
  Python: "#3572A5",
  Go: "#00ADD8",
  Nix: "#5276af",
  "C/C++": "#599eff",
  CUDA: "#76b900",
  Zig: "#ec915a",
  Java: "#b07219",
  Kotlin: "#A97BFF",
  Swift: "#F05138",
  Shell: "#89e051",
  Nushell: "#d39c67",
  Lua: "#000080",
  Ruby: "#701516",
  PHP: "#4F5D95",
  Svelte: "#ff3e00",
  Vue: "#42b883",
  CSS: "#563d7c",
  Markdown: "#083fa1",
};

export interface ProjectMeta {
  language: string | null;
  license: string | null;
  agentsFile: string | null;
  scripts: string[];
  trackedFiles: number | null;
}

export interface ProjectIdentity {
  name: string;
  root: string;
  cwd: string;

  shortPath: string;

  group: string;
  isRepo: boolean;
  bookmark: string;
}

export interface ProjectSummaryModel {
  identity: ProjectIdentity;
  meta: ProjectMeta;
  activity: ActivityModel;

  weekly: number[];
}

export function languageColor(language: string | null): string | null {
  if (language === null) return null;
  return LANGUAGE_COLORS[language] ?? null;
}

export function tsToMs(ts: string): number {
  return parseTimestamp(ts) ?? 0;
}

export function humanizeAgo(
  ms: number | null,
  now: number = Date.now(),
): string {
  if (ms === null || !Number.isFinite(ms) || ms <= 0) return "never";
  const d = now - ms;
  if (d < 60_000) return "just now";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
  if (d < 7 * 86_400_000) return `${Math.floor(d / 86_400_000)}d ago`;
  if (d < 35 * 86_400_000) return `${Math.floor(d / (7 * 86_400_000))}w ago`;
  return new Date(ms).toISOString().slice(0, 10);
}

export function formatCount(value: number): string {
  return value.toLocaleString("en-US");
}

export function isProjectRoot(path: string): boolean {
  return existsSync(join(path, ".jj"));
}

function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

function readPlainEntries(
  dir: string,
): { name: string; isDirectory: boolean }[] {
  try {
    return readdirSync(dir, { withFileTypes: true })
      .filter((e) => !e.isSymbolicLink())
      .map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
  } catch {
    return [];
  }
}

const META_FILE_LIMIT = 400;
const META_MAX_DEPTH = 3;

export function detectLanguage(repoPath: string): string | null {
  const counts = new Map<string, number>();
  let visited = 0;
  const walk = (dir: string, depth: number): void => {
    if (visited >= META_FILE_LIMIT || depth > META_MAX_DEPTH) return;
    for (const entry of readPlainEntries(dir)) {
      if (visited >= META_FILE_LIMIT) return;
      if (entry.name.startsWith(".") || SKIP_DIRS.has(entry.name)) continue;
      if (entry.isDirectory) {
        walk(join(dir, entry.name), depth + 1);
        continue;
      }
      visited++;
      const dot = entry.name.lastIndexOf(".");
      if (dot <= 0) continue;
      const lang = LANG_EXT[entry.name.slice(dot + 1).toLowerCase()];
      if (lang === undefined) continue;
      counts.set(lang, (counts.get(lang) ?? 0) + 1);
    }
  };
  walk(repoPath, 0);
  let best: string | null = null;
  let bestCount = 0;
  for (const [lang, count] of counts) {
    if (count > bestCount) {
      best = lang;
      bestCount = count;
    }
  }
  return best;
}

function licenseLabelFromName(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("mit")) return "MIT";
  if (n.includes("apache")) return "Apache-2.0";
  if (n.includes("lgpl")) return "LGPL";
  if (n.includes("gpl"))
    return n.includes("3") ? "GPL-3.0" : n.includes("2") ? "GPL-2.0" : "GPL";
  if (n.includes("bsd")) return "BSD";
  return null;
}

function licenseLabelFromText(text: string): string | null {
  const head = text.slice(0, 4000);
  if (/apache (software )?license/i.test(head)) return "Apache-2.0";
  if (/gnu general public license/i.test(head)) {
    if (/lesser/i.test(head)) return "LGPL";
    if (/version 3/i.test(head)) return "GPL-3.0";
    if (/version 2/i.test(head)) return "GPL-2.0";
    return "GPL";
  }
  if (/bsd license/i.test(head)) return "BSD";
  if (
    /\bmit license\b/i.test(head) ||
    /permission is hereby granted, free of charge/i.test(head)
  )
    return "MIT";
  return null;
}

export function detectLicense(repoPath: string): string | null {
  for (const name of [
    "LICENSE",
    "LICENSE.md",
    "LICENSE.txt",
    "COPYING",
    "LICENCE",
  ]) {
    const byName = licenseLabelFromName(name);
    if (byName !== null) return byName;
    const text = readText(join(repoPath, name));
    if (text === null) continue;
    const byText = licenseLabelFromText(text);
    if (byText !== null) return byText;
  }
  return null;
}

export function detectAgentsFile(repoPath: string): string | null {
  for (const name of [
    "AGENTS.md",
    "CLAUDE.md",
    ".cursorrules",
    "CONTRIBUTING.md",
  ]) {
    if (existsSync(join(repoPath, name))) return name;
  }
  return null;
}

export function readScripts(repoPath: string): string[] {
  const text = readText(join(repoPath, "package.json"));
  if (text === null) return [];
  try {
    const pkg = JSON.parse(text) as { scripts?: Record<string, unknown> };
    return Object.keys(pkg.scripts ?? {});
  } catch {
    return [];
  }
}

export function readProjectMeta(repoPath: string): ProjectMeta {
  return {
    language: detectLanguage(repoPath),
    license: detectLicense(repoPath),
    agentsFile: detectAgentsFile(repoPath),
    scripts: readScripts(repoPath),
    trackedFiles: null,
  };
}

function projectMetaLine(
  meta: ProjectMeta,
  identity: ProjectIdentity,
  now: number = Date.now(),
): string {
  const segments: string[] = [];
  if (meta.language !== null) segments.push(meta.language);
  if (meta.license !== null) segments.push(meta.license);
  if (identity.bookmark.length > 0 && identity.bookmark !== NO_BOOKMARK)
    segments.push(identity.bookmark);
  segments.push(`Updated ${humanizeAgo(null, now)}`);
  return segments.join(" · ");
}

export interface LoadSummaryOptions {
  cwd?: string;
  mock?: VcsMock;
  bookmark?: string;
  now?: Date;
}

export async function loadProjectSummary(
  options: LoadSummaryOptions = {},
): Promise<ProjectSummaryModel> {
  const cwd = options.cwd ?? process.cwd();
  const now = options.now ?? new Date();
  const root = findWorkspaceRoot(cwd);
  const isRepo = isProjectRoot(root);
  const meta = readProjectMeta(root);
  const identity: ProjectIdentity = {
    name: basename(root),
    root,
    cwd,
    shortPath: shortenPath(root),
    group: relative(dirname(root), root) || basename(root),
    isRepo,
    bookmark: options.bookmark ?? NO_BOOKMARK,
  };

  if (!isRepo) {
    return {
      identity,
      meta,
      activity: buildActivityModel([], new Map<string, string[]>(), now, 0),
      weekly: [],
    };
  }

  const [changes, bookmarks, files] = await Promise.all([
    loadChanges(SUMMARY_REVSET),
    listBookmarks(),
    run("jj", ["file", "list"], root),
  ]);

  const byChange = bookmarksByChange(bookmarks);
  return {
    identity,
    meta: {
      ...meta,
      trackedFiles:
        files.code === 0
          ? files.stdout.split("\n").filter((l) => l.trim().length > 0).length
          : null,
    },
    activity: buildActivityModel(changes as Change[], byChange, now),
    weekly: weeklyBuckets(changes as Change[], SPARKLINE_WEEKS, now.getTime()),
  };
}
