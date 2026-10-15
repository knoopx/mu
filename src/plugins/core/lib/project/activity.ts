import type { Change } from "../../../vcs/types";

export const WEEKS_SHOWN = 52;

export const MONTHS_SHOWN = 6;

export const FEED_COUNT = 25;

export interface HeatCell {
  key: string;
  count: number;

  level: number;

  future: boolean;
}

export interface HeatWeek {
  cells: HeatCell[];

  monthLabel: string;
}

export interface ActivityStats {
  total: number;

  windowTotal: number;
  contributors: number;
  activeDays: number;
  mostActiveDay: { label: string; count: number } | null;
  longestStreak: number;
  lastCommit: string | null;
  lastTouchedMs: number | null;
  conflicts: number;
}

export interface MonthlyCount {
  label: string;
  value: number;
}

export interface FeedChange {
  change: Change;
  bookmarks: string[];
}

export interface ActivityModel {
  weeks: HeatWeek[];
  dayLabels: string[];
  monthly: MonthlyCount[];
  stats: ActivityStats;
  recent: FeedChange[];
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function parseTimestamp(ts: string): number | null {
  const m = ts.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (m === null) return null;
  const ms = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  ).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function collectDaily(changes: Change[]): {
  daily: Map<string, number>;
  authors: Set<string>;
  lastCommitMs: number;
  conflicts: number;
} {
  const daily = new Map<string, number>();
  const authors = new Set<string>();
  let lastCommitMs = 0;
  let conflicts = 0;

  for (const c of changes) {
    if (c.author) authors.add(c.author);
    if (c.has_conflicts) conflicts++;
    const ms = parseTimestamp(c.timestamp);
    if (ms === null) continue;
    if (ms > lastCommitMs) lastCommitMs = ms;
    const key = dateKey(new Date(ms));
    daily.set(key, (daily.get(key) ?? 0) + 1);
  }

  return { daily, authors, lastCommitMs, conflicts };
}

function buildWeeks(daily: Map<string, number>, now: Date): HeatWeek[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - today.getDay());
  const oldestStart = new Date(thisWeekStart);
  oldestStart.setDate(thisWeekStart.getDate() - (WEEKS_SHOWN - 1) * 7);

  const weeks: HeatWeek[] = [];
  let prevMonth = -1;
  for (let w = 0; w < WEEKS_SHOWN; w++) {
    const weekStart = new Date(oldestStart);
    weekStart.setDate(oldestStart.getDate() + w * 7);
    const cells: HeatCell[] = [];
    let monthLabel = "";
    for (let d = 0; d < 7; d++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + d);
      const key = dateKey(day);
      const future = day.getTime() > today.getTime();
      const count = future ? 0 : (daily.get(key) ?? 0);
      cells.push({ key, count, level: 0, future });
    }

    const weekMonth = weekStart.getMonth();
    if (weekMonth !== prevMonth) {
      monthLabel = MONTH_NAMES[weekMonth];
      prevMonth = weekMonth;
    }
    weeks.push({ cells, monthLabel });
  }

  return weeks;
}

function assignCellLevels(
  weeks: HeatWeek[],
  daily: Map<string, number>,
): number {
  let max = 0;
  for (const v of daily.values()) max = Math.max(max, v);
  const maxL = Math.max(max, 1);

  let windowTotal = 0;
  for (const wk of weeks) {
    for (const cell of wk.cells) {
      windowTotal += cell.count;
      cell.level =
        cell.count === 0 ? 0 : 1 + Math.round((cell.count / maxL) * 3);
    }
  }

  return windowTotal;
}

function buildMonthly(daily: Map<string, number>, now: Date): MonthlyCount[] {
  const monthly: MonthlyCount[] = [];
  for (let m = MONTHS_SHOWN - 1; m >= 0; m--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - m, 1);
    const y = ref.getFullYear();
    const mo = ref.getMonth();
    let sum = 0;
    for (const [k, v] of daily) {
      const [ky, km] = k.split("-").map(Number);
      if (ky === y && km === mo + 1) sum += v;
    }
    monthly.push({ label: MONTH_NAMES[mo], value: sum });
  }
  return monthly;
}

function countActiveDays(daily: Map<string, number>): number {
  let activeDays = 0;
  for (const v of daily.values()) {
    if (v > 0) activeDays++;
  }
  return activeDays;
}

function mostActiveDayOf(
  daily: Map<string, number>,
): { label: string; count: number } | null {
  let mostActiveDay: { label: string; count: number } | null = null;
  for (const [k, v] of daily) {
    if (mostActiveDay === null || v > mostActiveDay.count)
      mostActiveDay = { label: k, count: v };
  }
  return mostActiveDay;
}

function longestStreakOf(daily: Map<string, number>): number {
  const sortedDays = [...daily.keys()].sort();
  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < sortedDays.length; i++) {
    if (i > 0) {
      const prev = new Date(sortedDays[i - 1]);
      const cur = new Date(sortedDays[i]);
      const diffDays = (cur.getTime() - prev.getTime()) / 86_400_000;
      run = diffDays === 1 ? run + 1 : 1;
    } else {
      run = 1;
    }
    if (run > longestStreak) longestStreak = run;
  }
  return longestStreak;
}

export function weeklyBuckets(
  changes: Change[],
  weeks: number = 12,
  now: number = Date.now(),
): number[] {
  const out = new Array<number>(weeks).fill(0);
  const today = new Date(now);
  const thisWeekStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
  for (const c of changes) {
    const ms = parseTimestamp(c.timestamp);
    if (ms === null || ms > now) continue;
    const d = new Date(ms);
    const wk = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    wk.setDate(wk.getDate() - wk.getDay());
    const weeksAgo = Math.round(
      (thisWeekStart.getTime() - wk.getTime()) / (7 * 86_400_000),
    );
    const idx = weeks - 1 - weeksAgo;
    if (idx >= 0 && idx < weeks) out[idx] += 1;
  }
  return out;
}

export function buildActivityModel(
  changes: Change[],
  bookmarks: Map<string, string[]>,
  now: Date = new Date(),
  feedCount: number = FEED_COUNT,
): ActivityModel {
  const { daily, authors, lastCommitMs, conflicts } = collectDaily(changes);
  const weeks = buildWeeks(daily, now);
  const windowTotal = assignCellLevels(weeks, daily);
  const lastCommit =
    lastCommitMs > 0 ? new Date(lastCommitMs).toISOString().slice(0, 10) : null;

  return {
    weeks,
    dayLabels: ["S", "M", "T", "W", "T", "F", "S"],
    monthly: buildMonthly(daily, now),
    stats: {
      total: changes.length,
      windowTotal,
      contributors: authors.size,
      activeDays: countActiveDays(daily),
      mostActiveDay: mostActiveDayOf(daily),
      longestStreak: longestStreakOf(daily),
      lastCommit,
      lastTouchedMs: lastCommitMs > 0 ? lastCommitMs : null,
      conflicts,
    },
    recent: changes.slice(0, feedCount).map((change) => ({
      change,
      bookmarks: bookmarks.get(change.change_id) ?? [],
    })),
  };
}
