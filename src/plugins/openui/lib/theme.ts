/**
 * The colour words a program speaks, and the theme colour each one draws.
 *
 * A program never names a hex: it writes `tone: "muted"`, `Badge("late", "danger")`,
 * `Pane(..., "sunken")`. This file is the only place that decides those words
 * mean adwaita's text tones, its functional colours and its surface scale, and
 * it defers to core's `mutedText` rather than reaching for `t.color.text.dim`.
 */

import type {
  AdwaitaTheme,
  BadgeVariant,
  ButtonVariant,
  IconName,
  ProgressBarColor,
  TimelineStatus,
} from "adwaita-gpuix";

import { mutedText, withAlpha } from "../../core/lib/ui/theme";
import type { ProgramStatus } from "../types";

/** What a program may call a colour. */
export type ProgramTone =
  | "ink"
  | "muted"
  | "faint"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "surface"
  | "sunken"
  | "card";

/** The text colour of a tone. */
export function programTextColor(
  t: AdwaitaTheme,
  tone: ProgramTone | null | undefined,
): string {
  switch (tone ?? "ink") {
    case "muted":
      return mutedText(t);
    case "faint":
      // Not `divider.faint`: in dark and nightsky that is the card's own colour,
      // and a faint tone would then print nothing at all. A faded ink is the ink
      // of a block's own words, held back rather than erased.
      return withAlpha(t.color.text.secondary, 0.6);
    case "accent":
    case "info":
      return t.color.accent.base;
    case "success":
      return t.color.functional.success;
    case "warning":
      return t.color.functional.warning;
    case "danger":
      return t.color.functional.destructive;
    case "surface":
    case "sunken":
    case "card":
      return t.color.text.primary;
    default:
      return t.color.text.primary;
  }
}

/** The badge a tone wears. */
export function programBadgeVariant(
  tone: ProgramTone | null | undefined,
): BadgeVariant {
  switch (tone) {
    case "danger":
      return "destructive";
    case "warning":
      return "warning";
    case "success":
      return "success";
    case "muted":
    case "faint":
      return "secondary";
    default:
      return "outline";
  }
}

/** The button a tone is: what asks something of the agent, what is only a step. */
export function programButtonVariant(
  tone: ProgramTone | null | undefined,
): ButtonVariant {
  switch (tone) {
    case "accent":
    case "info":
      return "suggested";
    case "danger":
      return "destructive";
    case "muted":
    case "faint":
      return "text";
    default:
      return "default";
  }
}

/** The tone words a program may write, as the library declares them. */
const TONE_WORDS: readonly string[] = [
  "ink",
  "muted",
  "faint",
  "accent",
  "info",
  "success",
  "warning",
  "danger",
  "surface",
  "sunken",
  "card",
];

/** A row's tone cell, read as a tone word — or nothing when it named none. */
export function toneOfValue(value: unknown): ProgramTone | null {
  if (typeof value !== "string") return null;
  const word = value.trim().toLowerCase();
  return TONE_WORDS.includes(word) ? (word as ProgramTone) : null;
}

/**
 * The meter a tone drives.
 *
 * A program says `"danger"`; adwaita's meters say `"destructive"`. One table,
 * shared by `Bar`, `Steps` and a span of a `Trace`, so a warning reads the same
 * colour wherever a program puts it.
 */
export function programProgressTone(
  tone: ProgramTone | null | undefined,
): ProgressBarColor {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "danger":
      return "destructive";
    default:
      return "accent";
  }
}

/**
 * The mark a state of work wears.
 *
 * A check that has happened is quiet and outlined; the one being worked on is the
 * accent; what has not happened yet is a ring, and what was skipped is a ring with
 * a bar through it. A running line is a spinner, so this answers null and the
 * caller knows to turn something.
 */
export function programStatusGlyph(status: ProgramStatus): IconName | null {
  switch (status) {
    case "done":
      return "checkCircleOutline";
    case "current":
      return "radioButtonChecked";
    case "pending":
      return "radioButtonUnchecked";
    case "skipped":
      return "block";
    case "error":
      return "error";
    case "running":
      return null;
  }
}

/**
 * The mark a block's tone wears, when the tone is a state and not a colour.
 *
 * A `Pane` whose tone is `warning` says so before its title does, the way the
 * log's own tool headers do. A tone that is only a colour — `muted`, `surface` —
 * carries no mark, because a colour is not news.
 */
export function programToneGlyph(tone: ProgramTone): IconName | null {
  switch (tone) {
    case "warning":
    case "danger":
      return "error";
    case "success":
      return "checkCircle";
    case "accent":
    case "info":
      return "info";
    default:
      return null;
  }
}

/** How loud a state is: only the one being worked on, and what went wrong, are colour. */
export function programStatusColor(
  t: AdwaitaTheme,
  status: ProgramStatus,
): string {
  switch (status) {
    case "done":
      return t.color.text.secondary;
    case "current":
    case "running":
      return t.color.accent.base;
    case "error":
      return t.color.functional.destructive;
    case "pending":
    case "skipped":
      return t.color.divider.strong;
  }
}

/**
 * The same state, told to a timeline, which has three marks rather than six: the
 * past behind it, the point the reader stands at, and the events still ahead.
 */
export function programStatusToTimeline(status: ProgramStatus): TimelineStatus {
  switch (status) {
    case "current":
    case "running":
    case "error":
      return "current";
    case "pending":
    case "skipped":
      return "upcoming";
    case "done":
      return "done";
  }
}

/** What a `Pane`'s body is filled with. */
export function programSurfaceFill(
  t: AdwaitaTheme,
  surface: "card" | "sunken" | "plain" | null | undefined,
): string {
  if (surface === "sunken") return t.color.surface.sunken;
  if (surface === "plain") return "transparent";
  return t.color.surface.card;
}

/** The rule between the rows of a program's own block. A rule is painted with
 *  the default divider and never the faint one: in dark and nightsky `faint` is
 *  the card's own colour, so a faint rule draws nothing and a table loses the
 *  lines that make it a table. */
export const programRule = (t: AdwaitaTheme): string => t.color.divider.default;

/** A hairline in the tone a block's edge is drawn with. */
export function programEdge(
  t: AdwaitaTheme,
  tone: ProgramTone | null | undefined,
): string {
  if (tone === undefined || tone === null) return programRule(t);
  if (tone === "accent" || tone === "info")
    return withAlpha(t.color.accent.base, 0.4);
  if (tone === "danger") return withAlpha(t.color.functional.destructive, 0.4);
  if (tone === "warning") return withAlpha(t.color.functional.warning, 0.4);
  if (tone === "success") return withAlpha(t.color.functional.success, 0.4);
  return programRule(t);
}
