/**
 * A page read, in the log.
 *
 * Its own conversation: the agent going to a library's own documentation because a
 * search snippet is not evidence, the same page read a second time out of mu's
 * cache, and a page that refused the read. The figures under each row — and the
 * line saying how much of the page the log left out — come from the plugin's own
 * `pageAnswer` and `capPage`, so the picture is the code's answer, not a drawing of
 * it.
 */

import { FETCH_TOOL_NAME } from "../../../src/plugins/web-fetch/constants";
import { capPage } from "../../../src/plugins/web-fetch/lib/clean";
import { pageAnswer } from "../../../src/plugins/web-fetch/lib/text";
import type { WebFetchDetails } from "../../../src/plugins/web-fetch/types";
import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, failed, usage, userTurn } from "../turn";

export const ORIENTATION_URL =
  "https://docs.rs/photon/latest/photon/imageops/orientation/index.html";

const ORIENTATION_PAGE = [
  "# Orientation in photon",
  "",
  "Every `Image` carries an EXIF orientation in its metadata, and drawing one",
  "ignores that value: the pixels are what they are.",
  "",
  "## `compute_transformed_image`",
  "",
  "The resize helpers apply the orientation first, then resize, then rewrite the",
  "metadata to say the result is upright. Pass `no_exif_orientation = true` to",
  "skip the rotation — that is the flag a pipeline wants when it has already",
  "normalised the pixels itself.",
  "",
  "## `fix_orientation`",
  "",
  "Rotates the pixels and sets the orientation to `1`. It is not idempotent in the",
  "sense that a second call is wasted work rather than a reversal: check the",
  "value in the metadata first, because 9 of the 8 values are already upright.",
  "",
  "## Thumbnail stripping",
  "",
  "EXIF carries a thumbnail of its own in `Exif Thumbnail`. Nothing strips it, and",
  "a resized image that keeps the old thumbnail keeps a picture of the old size",
  "inside it.",
].join("\n");

export const ORIENTATION_DETAILS: WebFetchDetails = {
  url: ORIENTATION_URL,
  host: "docs.rs",
  status: "ok",
  page: ORIENTATION_PAGE,
  chars: ORIENTATION_PAGE.length,
  lines: ORIENTATION_PAGE.split("\n").length,
  truncated: false,
  cached: false,
  excerpt: ORIENTATION_PAGE.split("\n")
    .filter((line) => line.trim() !== "")
    .slice(0, 6),
  elapsedMs: 1_640,
};

const ORIENTATION_ITEM = ran(
  "call-fetch-orientation",
  FETCH_TOOL_NAME,
  { url: ORIENTATION_URL },
  pageAnswer(ORIENTATION_DETAILS),
  2_000,
  { details: ORIENTATION_DETAILS },
);

/** The same page, read again: the browser is not asked twice in a day. */
const ORIENTATION_AGAIN_DETAILS: WebFetchDetails = {
  ...ORIENTATION_DETAILS,
  cached: true,
  elapsedMs: 4,
};

const ORIENTATION_AGAIN_ITEM = ran(
  "call-fetch-orientation-again",
  FETCH_TOOL_NAME,
  { url: ORIENTATION_URL },
  pageAnswer(ORIENTATION_AGAIN_DETAILS),
  9_000,
  { details: ORIENTATION_AGAIN_DETAILS },
);

/** A long page, answered with its opening and the size of the whole. */
const API_URL = "https://docs.rs/photon/latest/photon/index.html";

const API_PAGE = [
  "# photon",
  "",
  "An image processing library for Rust: resizing, crops, filters, watermarks,",
  "EXIF and the little operations a thumbnail pipeline is made of.",
  "",
  "## Structs",
  "",
  "`Image`, `PhotonImage`, `MetaData` — every function in the crate takes one of",
  "the first two, and `MetaData` is the only way to ask what the file already",
  "knows about itself.",
  "",
  "## Modules",
  "",
].join("\n");

const API_TAIL =
  "`aliening`, `artistic`, `channels`, `edge`, `effects`, `filters`, `geometry`,\n" +
  "`grayscale`, `hdr`, `hsl`, `metadata`, `native`, `normalize`, `option`,\n" +
  "`orientation`, `painters`, `pixelops`, `quantize`, `threshold`, `transform`,\n" +
  "`utilities`.\n\n".repeat(40);

const API_WHOLE = `${API_PAGE}\n${API_TAIL}`;
const API_CAPPED = capPage(API_WHOLE);

export const API_DETAILS: WebFetchDetails = {
  url: API_URL,
  host: "docs.rs",
  status: "ok",
  page: API_CAPPED.text,
  chars: API_WHOLE.length,
  lines: API_WHOLE.split("\n").length,
  truncated: API_CAPPED.truncated,
  cached: false,
  excerpt: API_WHOLE.split("\n")
    .filter((line) => line.trim() !== "")
    .slice(0, 6),
  elapsedMs: 14_900,
};

const API_ITEM = ran(
  "call-fetch-api",
  FETCH_TOOL_NAME,
  { url: API_URL },
  pageAnswer(API_DETAILS),
  12_000,
  { details: API_DETAILS },
);

/** A page that refused the read, marked as one rather than as an empty answer. */
const DEAD_ITEM = failed(
  "call-fetch-dead",
  FETCH_TOOL_NAME,
  { url: "https://docs.rs/photon/latest/photon/imageops/resize/index.html" },
  "web-fetch failed: The page could not be read: Error: Failed to navigate to https://docs.rs/photon/latest/photon/imageops/resize/index.html: Network error: timed out",
  30_000,
);

export const PAGE_READ_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-fetch-orientation",
    "before the resize worker ships: what does the image library's own page say about EXIF orientation? I do not want to hand-strip it twice",
    0,
  ),
  ORIENTATION_ITEM,
  {
    ...answer(
      "a-fetch-orientation",
      [
        "Its own helpers already do the rotation, and they rewrite the metadata to say the result is upright — so stripping it by hand would rotate the picture twice.",
        "",
        "Two things on that page change our plan. `fix_orientation` is not a reversal, so the worker has to read the value before calling it. And nothing strips the EXIF thumbnail: a resized image keeps a picture of its old size inside it, which is exactly what an inline image sent to a provider should not carry.",
      ].join("\n"),
    ),
    usage: usage(14_200, 1_610, 0, 1, 4),
  },
  userTurn(
    "u-fetch-again",
    "the thumbnail thing again — where did you read that",
    6,
  ),
  ORIENTATION_AGAIN_ITEM,
  {
    ...answer(
      "a-fetch-again",
      "The same page, and mu had it already — that read took 4ms and cost no request. It is the `Thumbnail stripping` section, and the wording is verbatim: nothing strips it.",
    ),
    usage: usage(8_900, 420, 0, 6, 8),
  },
  userTurn("u-fetch-api", "and how big is that crate's own index page", 8),
  API_ITEM,
  DEAD_ITEM,
  {
    ...answer(
      "a-fetch-shape",
      [
        `The index runs ${String(API_DETAILS.lines)} lines, so I was given its opening and the module list, and the answer says so rather than pretending I read the rest — which is why I am not claiming anything about the functions further down it.`,
        "",
        `The row says it too: ${String(API_DETAILS.lines - 6)} more lines not shown.`,
        "",
        "The last row is a timeout, not an empty page: the resize module's page never answered, so I have not said anything about `resize`'s arguments. That still needs checking, and the page may simply have been slow.",
      ].join("\n"),
      {
        reasoning:
          "Two of these reads are bounded in different ways — one page was capped by mu, one never arrived. The reader has to be able to tell a capped read from a failed one, because both look like silence in the answer.",
      },
    ),
    usage: usage(16_400, 1_240, 0, 12, 20),
  },
];
