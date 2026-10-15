import { resultsText } from "../../src/plugins/web-search/lib/duckduckgo/text";
import { SEARCH_TOOL_NAME } from "../../src/plugins/web-search/constants";
import {
  type WebSearchDetails,
  WebSearchResult,
} from "../../src/plugins/web-search/types";
import { toolCallFixture, type ToolFixture } from "./tool";

export const SEARCH_QUERY =
  "css object-fit cover crop position portrait thumbnail";

const ROWS: Omit<WebSearchResult, "rank" | "host">[] = [
  {
    title: "object-fit - CSS | MDN",
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/object-fit",
    snippet:
      "The object-fit CSS property sets how the content of a replaced element, such as an <img> or",
  },
  {
    title: "object-position - CSS | MDN",
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/object-position",
    snippet:
      "The object-position CSS property specifies the alignment of the selected enclosed element",
  },
  {
    title: "Thumbnail cropping: why centre crop fails for portraits",
    url: "https://css-tricks.com/crop-anchor-and-the-portrait-problem/",
    snippet:
      "A centre crop of a tall frame keeps the middle of the image, which for a person is usually",
  },
  {
    title: "Focal-point aware thumbnails with EXIF and a crop anchor",
    url: "https://www.smashingmagazine.com/2024/05/focal-point-crops/",
    snippet:
      "Store the focal point beside the image, then bias the crop toward it, and a 48px tile keeps",
  },
  {
    title: "Letterbox, crop, or stretch: three ways to fill a square tile",
    url: "https://www.joshwcomeau.com/css/thumbnail-fitting/",
    snippet:
      "Cover crops, contain letterboxes, and fill stretches. Only one of them lies about the photo",
  },
  {
    title: "EXIF Orientation 101 - how to rotate images correctly",
    url: "https://mignwa.com/2012/05/exif-orientation-101/",
    snippet:
      "The pixel dimensions in the JPEG are not the display dimensions when orientation is 6 or 8",
  },
  {
    title: "image-rendering and aspect ratio in native GPU UIs",
    url: "https://github.com/zed-industries/zed/discussions/21488",
    snippet:
      "A GPU UI samples the texture at the layout size, so a tile that is square samples a square",
  },
  {
    title: "Sharp: resize, extract, and crop anchors for thumbnails",
    url: "https://sharp.pixelplumbing.com/api-resize",
    snippet:
      "resize({ fit: 'cover', position: 'entropy' }) crops to the region of highest entropy, which",
  },
  {
    title: "Why your portrait thumbnails cut heads off",
    url: "https://benadam.smith/blog/portrait-thumbnail-crops/",
    snippet:
      "The crop is computed from the frame, not from the subject, and portrait frames put the subject",
  },
  {
    title: "Aspect ratios in a flex layout: the height you did not ask for",
    url: "https://web.dev/articles/css-aspect-ratio",
    snippet:
      "aspect-ratio reserves the box before the image loads, which removes the layout shift a",
  },
];

const hostOfUrl = (url: string): string => {
  const host = new URL(url).hostname.toLowerCase();
  return host.startsWith("www.") ? host.slice(4) : host;
};

export const SEARCH_RESULTS: WebSearchResult[] = ROWS.map((row, i) => ({
  rank: i + 1,
  host: hostOfUrl(row.url),
  ...row,
}));

export const SEARCH_DETAILS: WebSearchDetails = {
  status: "ok",
  query: SEARCH_QUERY,
  results: SEARCH_RESULTS,
  count: SEARCH_RESULTS.length,
  elapsedMs: 1_980,
};

export const SEARCH_EMPTY_DETAILS: WebSearchDetails = {
  status: "no-results",
  query: "gpuix react img objectPosition prop",
  results: [],
  count: 0,
  elapsedMs: 1_240,
};

export const SEARCH_TOOL_ITEM: ToolFixture = toolCallFixture(
  "call-search-ok",
  SEARCH_TOOL_NAME,
  { query: SEARCH_QUERY },
  "ok",
  resultsText(SEARCH_QUERY, SEARCH_RESULTS),
  { details: SEARCH_DETAILS },
);

export const SEARCH_TOOL_ITEM_SHORT: ToolFixture = toolCallFixture(
  "call-search-short",
  SEARCH_TOOL_NAME,
  { query: SEARCH_QUERY, limit: 3 },
  "ok",
  resultsText(SEARCH_QUERY, SEARCH_RESULTS.slice(0, 3)),
  {
    details: {
      status: "ok",
      query: SEARCH_QUERY,
      results: SEARCH_RESULTS.slice(0, 3),
      count: 3,
      elapsedMs: 620,
    },
  },
);

export const SEARCH_TOOL_ITEM_EMPTY: ToolFixture = toolCallFixture(
  "call-search-none",
  SEARCH_TOOL_NAME,
  { query: SEARCH_EMPTY_DETAILS.query },
  "ok",
  resultsText(SEARCH_EMPTY_DETAILS.query, []),
  { details: SEARCH_EMPTY_DETAILS },
);

export const SEARCH_TOOL_ITEM_RUNNING: ToolFixture = toolCallFixture(
  "call-search-running",
  SEARCH_TOOL_NAME,
  { query: SEARCH_QUERY },
  "running",
  "",
);

export const SEARCH_TOOL_ITEM_ERROR: ToolFixture = toolCallFixture(
  "call-search-timeout",
  SEARCH_TOOL_NAME,
  { query: "exif orientation 6 canvas drawImage rotation" },
  "error",
  "Web search failed: page load timed out after 30s",
);
