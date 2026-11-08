/**
 * The scale a drawn program is measured in.
 *
 * A program's arguments are numbers and size words — `gap 3`, `Title("x","lg")` —
 * so something has to say what those count for, and it is this file: the step a
 * gap counts, the tier words a program leaves unset, the text sizes a program
 * may ask for and the line boxes they stand in. Nothing here invents a scale
 * adwaita already owns: the sizes are its `type` keys, the radius and padding
 * its `radius` and `space`, and a one-line row is core's `ROW_HEIGHT`.
 */

import type { AdwaitaTheme, TextSize } from "adwaita-gpuix";

import {
  INLINE_GLYPH,
  ROW_HEIGHT,
  emphasisWeight,
  titleWeight,
} from "../../core/lib/ui/tokens";
import { PROGRAM_GAP_TIER } from "../constants";

/** One step of a program's `gap` argument, in pixels: the language's unit. */
export const GAP_STEP = 4;

/** How far a gap may grow however a program writes it: two sections. */
const GAP_MAX_STEPS = 12;

/** What a program's `gap` number turns into. */
export const programGap = (
  t: AdwaitaTheme,
  steps: number | undefined,
): number => {
  const counted = Math.max(0, Math.floor(steps ?? 0));
  return Math.min(counted, GAP_MAX_STEPS) * GAP_STEP;
};

/** The three tiers a program's blocks nest in, when it leaves a gap unset. */
export const innerGap = (t: AdwaitaTheme): number => programGap(t, PROGRAM_GAP_TIER.inner);

export const groupGap = (t: AdwaitaTheme): number => programGap(t, PROGRAM_GAP_TIER.group);

export const sectionGap = (t: AdwaitaTheme): number =>
  programGap(t, PROGRAM_GAP_TIER.section);

/** The sizes a program may name, and the adwaita role each one is drawn at. */
export type ProgramTextSize = "sm" | "md" | "lg" | "xl";

/**
 * The ladder a program climbs. `sm` and `md` are the sizes of text — a screen's
 * prose and its quietest lines — and `lg`/`xl` are sizes of *figures*: what a
 * screen reads out as its number. adwaita's scale has one heading size between
 * them, so the ladder steps from prose to title to display rather than pretending
 * to have four even rungs.
 */
const TEXT_SIZE: Record<ProgramTextSize, TextSize> = {
  sm: "list",
  md: "body",
  lg: "title1",
  xl: "display",
};

/** The size of a screen's headline figure — the total of a `Breakdown`, the count
 *  a screen is about. It is the one size a program may not set by word. */
export const programFigureRole: TextSize = "display";

export const programTextRole = (size: ProgramTextSize | undefined): TextSize =>
  TEXT_SIZE[size ?? "md"];

/** The height of every one-line row a program draws — the log's own row. */
export const programRowHeight: number = ROW_HEIGHT;

/**
 * How far a line stands in when the row above it carries a mark: the mark's own
 * width plus the gap it sits in. A section's note, a todo's line of its own and a
 * trace's child span all hang at this measure, so text under a mark lines up with
 * the text beside it.
 */
export const programMarkIndent = (t: AdwaitaTheme): number =>
  INLINE_GLYPH + innerGap(t);

/** A program's weights: a title and an emphasised line. */
export const programTitleWeight = (t: AdwaitaTheme): number => titleWeight(t);
export const programEmphasisWeight = (t: AdwaitaTheme): number =>
  emphasisWeight(t);

/** What a `Pane` and the program body stand in. */
export const panePad = (t: AdwaitaTheme): number => t.space.md;
export const paneRadius = (t: AdwaitaTheme): number => t.radius.md;
export const screenPad = (t: AdwaitaTheme): number => t.space.sm;
