import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, userTurn, usage } from "../turn";

/**
 * A session long enough that `Ctrl+R` has something to find: the same problem
 * phrased four times, and only one of those phrasings is the one that worked.
 */
export const PROMPT_SEARCH_ITEMS: TranscriptItem[] = [
  userTurn("u-p1", "the photo strip is cropping wrong — fix the anchor", 0),
  ran(
    "c-crop-1",
    "edit",
    { path: "src/plugins/figures/lib/plot.ts" },
    "Successfully replaced 1 block(s) in src/plugins/figures/lib/plot.ts.",
    3_000,
  ),
  answer("a-p1", "Anchored the crop on the frame's own aspect instead of the tile's."),
  userTurn("u-p2", "no — the strip is still cutting the sky off the portrait", 60_000),
  userTurn(
    "u-p3",
    "what rule did you land on for the strip? I want the same rule in the preview",
    180_000,
  ),
  {
    ...answer(
      "a-p3",
      "Taller than wide: anchor top. Wider than tall: centre, cut the sides. That is the whole rule, and it reads the frame, not the tile.",
      { reasoning: "The rule is short enough to quote, so the answer is the quote." },
    ),
    usage: usage(6_400, 210, 0, 1, 0),
  },
  userTurn(
    "u-p4",
    "find the prompt where I first complained about the crop and rerun it as a question",
    300_000,
  ),
];
