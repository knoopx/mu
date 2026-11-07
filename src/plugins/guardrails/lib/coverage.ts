import { getAgentDir } from "@earendil-works/pi-coding-agent";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  BLOCK_MARK,
  COVERAGE_DEFAULT_DAYS,
  MAX_COVERAGE_FILES,
  SESSIONS_DIR_NAME,
} from "../constants";
import type { GuardrailCoverageRow } from "../types";
import { guardrailRules } from "./rules";

/**
 * Coverage: which guardrail domains fire in real sessions, and which never do.
 *
 * A rule that has not blocked anything in a week of work is a rule nobody has
 * tested against reality — it is either right and rare, or wrong and quiet. The
 * scan reads saved session transcripts and counts only *observed* blocks: tool
 * results whose text opens with the block reason. Prose that quotes the reason
 * is not a block, so the line is parsed as JSON and the role is checked.
 */

export interface GuardrailCoverage {
  dir: string;
  dirExists: boolean;
  files: number;
  scanned: number;
  windowDays: number;
  rows: GuardrailCoverageRow[];
  /** True when the file cap cut the scan short, so the counts are a floor. */
  truncated: boolean;
  error: string | null;
}

export const expandHome = (path: string): string =>
  path === "~"
    ? homedir()
    : path.startsWith("~/")
      ? join(homedir(), path.slice(2))
      : path;

export const defaultSessionsDir = (): string =>
  join(getAgentDir(), SESSIONS_DIR_NAME);

const DAY_MS = 24 * 60 * 60 * 1_000;

const jsonlFiles = (dir: string, sinceMs: number, cap: number): string[] => {
  const out: string[] = [];
  const stack = [dir];
  while (stack.length > 0 && out.length < cap) {
    const at = stack.pop()!;
    let entries: string[];
    try {
      entries = readdirSync(at);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const path = join(at, entry);
      let stats;
      try {
        stats = statSync(path);
      } catch {
        continue;
      }
      if (stats.isDirectory()) stack.push(path);
      else if (
        entry.endsWith(".jsonl") &&
        (sinceMs === 0 || stats.mtimeMs >= sinceMs)
      )
        out.push(path);
      if (out.length >= cap) break;
    }
  }
  return out;
};

interface Observed {
  blocks: number;
  lastMs: number;
}

const domainOf = (text: string): string | null => {
  const at = text.indexOf(BLOCK_MARK);
  if (at !== 0) return null;
  const rest = text.slice(BLOCK_MARK.length);
  const end = rest.indexOf("):");
  if (end <= 0) return null;
  return rest.slice(0, end).trim();
};

const scanFile = (path: string, observed: Map<string, Observed>): number => {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return 0;
  }
  let lines = 0;
  for (const line of text.split("\n")) {
    if (line.indexOf(BLOCK_MARK) === -1) continue;
    lines += 1;
    let record: unknown;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    const message = (
      record as {
        message?: { role?: string; content?: unknown };
        timestamp?: string;
      }
    ).message;
    if (message?.role !== "toolResult") continue;
    const blocks = Array.isArray(message.content)
      ? (message.content as { type?: string; text?: string }[])
      : [];
    for (const block of blocks) {
      if (block.type !== "text" || typeof block.text !== "string") continue;
      const domain = domainOf(block.text);
      if (domain === null) continue;
      const stamp = (record as { timestamp?: string }).timestamp;
      const when = (stamp === undefined ? 0 : Date.parse(stamp)) || 0;
      const seen = observed.get(domain) ?? { blocks: 0, lastMs: 0 };
      seen.blocks += 1;
      seen.lastMs = Math.max(seen.lastMs, when);
      observed.set(domain, seen);
    }
  }
  return lines;
};

const ago = (ms: number, now: number): string => {
  if (ms <= 0) return "";
  const seconds = Math.max(0, Math.round((now - ms) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
};

/**
 * The coverage report. The universe is the rule registry, so a domain that
 * fired in an old session and is no longer a rule shows as a legacy row.
 */
export function guardrailCoverage(
  sessionsDir: string | undefined,
  windowDays: number,
  now = Date.now(),
): GuardrailCoverage {
  const dir = expandHome(sessionsDir ?? defaultSessionsDir());
  const days = windowDays < 0 ? COVERAGE_DEFAULT_DAYS : windowDays;
  const sinceMs = days === 0 ? 0 : now - days * DAY_MS;
  const observed = new Map<string, Observed>();
  const files = jsonlFiles(dir, sinceMs, MAX_COVERAGE_FILES + 1);
  const scanned = files.slice(0, MAX_COVERAGE_FILES);
  let lines = 0;
  for (const path of scanned) lines += scanFile(path, observed);

  const rules = guardrailRules();
  const domains = [...new Set(rules.map((rule) => rule.domain))].sort();
  const rows: GuardrailCoverageRow[] = domains.map((domain) => {
    const seen = observed.get(domain);
    return {
      domain,
      source: rules.some((rule) => rule.domain === domain) ? "ruled" : "legacy",
      blocks: seen?.blocks ?? 0,
      last: ago(seen?.lastMs ?? 0, now),
      never: seen === undefined || seen.blocks === 0,
    };
  });
  for (const [domain, seen] of [...observed].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    if (domains.includes(domain)) continue;
    rows.push({
      domain,
      source: "legacy",
      blocks: seen.blocks,
      last: ago(seen.lastMs, now),
      never: false,
    });
  }
  return {
    dir,
    dirExists: existsSync(dir),
    files: scanned.length,
    scanned: lines,
    windowDays: days,
    rows,
    truncated: files.length > MAX_COVERAGE_FILES,
    error: existsSync(dir) ? null : `no session directory at ${dir}`,
  };
}
