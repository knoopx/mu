import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import {
  GREP_OBJECT_FIT,
  IDENTIFY_PICTURES,
  LS_PICTURES,
  READ_THUMB_STRIP,
  READ_THUMB_STYLES,
  TILE_DIFF,
  TILE_PATCH,
  TYPECHECK_CLEAN,
  TYPECHECK_NO_OBJECT_POSITION,
} from "../output";
import {
  PREVIEW_ANSWER,
  PREVIEW_COMPARE,
  PREVIEW_FIX_ANSWER,
  PREVIEW_REASONING,
  PREVIEW_RELEASE_ANSWER,
  PREVIEW_RELEASE_NOTES,
  PREVIEW_STREAM,
} from "../prose";
import { PASTED_IMAGES } from "../composer";
import { photoFile, photoOf } from "../media";
import { answer, at, failed, min, ran, usage, userTurn } from "../turn";

const photo = photoOf;

const ATTACHMENTS_PATH = "src/plugins/core/components/composer/attachments.tsx";

export const SESSION_START_TEXT =
  "Session started in ~/Projects/gpuix-apps/mu · model local/ostfralla/Qwen3.8-27B · thinking xhigh";

export const PHOTOS_TURN: TranscriptItem[] = [
  userTurn(
    "u-strip",
    "three photos, one tile each in the strip. the meadow one loses the fence post completely, the star trails lose the ridge, and the portrait loses the skyline and the bridge.\n\nlook at them before you answer, i'm not describing them from memory. tell me what each tile keeps and what the preview shows",
    0,
    PASTED_IMAGES,
  ),
  ran(
    "c-identify",
    "bash",
    { command: "identify ~/Pictures/2026/*.jpg" },
    IDENTIFY_PICTURES,
    4_000,
  ),
  ran(
    "c-read-bay",
    "read",
    { path: photo("bay").path },
    "Read image file [image/jpeg]",
    9_000,
    { image: photoFile("bay") },
  ),
  ran(
    "c-read-stars",
    "read",
    { path: photo("stars").path },
    "Read image file [image/jpeg]",
    13_000,
    { image: photoFile("stars") },
  ),
  ran(
    "c-grep-fit",
    "grep",
    { pattern: "objectFit", path: "src" },
    GREP_OBJECT_FIT,
    18_000,
  ),
  ran(
    "c-read-strip",
    "read",
    { path: ATTACHMENTS_PATH, offset: 161, limit: 22 },
    READ_THUMB_STRIP,
    22_000,
  ),
  {
    ...answer("a-strip", PREVIEW_ANSWER, { reasoning: PREVIEW_REASONING }),
    usage: usage(14_800, 3_940, 0, 1, 3),
  },
];

export const STRIP_FIX_TURN: TranscriptItem[] = [
  userTurn(
    "u-anchor",
    "keep the tile at 48px, i'm not touching the size. anchor the crop on the frame: top when it's taller than wide, centre when it's wide. no letterboxing in the strip, a strip of letterboxed squares reads as broken chrome.\n\nthe anchor is a function of the two dimensions, not a guess per photo",
    6,
  ),
  ran(
    "c-read-styles",
    "read",
    { path: ATTACHMENTS_PATH, offset: 86, limit: 44 },
    READ_THUMB_STYLES,
    25_000,
  ),
  ran(
    "c-edit-first",
    "edit",
    {
      path: ATTACHMENTS_PATH,
      edits: [
        {
          oldText: '            objectFit="cover"',
          newText:
            '            objectFit="cover"\n            style={thumbImage(image.width, image.height)}',
        },
      ],
    },
    "Successfully replaced 1 block(s) in src/plugins/core/components/composer/attachments.tsx.",
    30_000,
    { details: { patch: TILE_PATCH, diff: TILE_DIFF, firstChangedLine: 176 } },
  ),
  failed(
    "c-typecheck-fail",
    "bash",
    { command: "bun run typecheck" },
    TYPECHECK_NO_OBJECT_POSITION,
    36_000,
  ),
  userTurn(
    "u-steer",
    "that's not a style key in this renderer — objectPosition is a prop on the image, put it where objectFit already lives",
    8,
  ),
  ran(
    "c-edit-anchor",
    "edit",
    {
      path: ATTACHMENTS_PATH,
      edits: [
        {
          oldText: '            objectFit="cover"',
          newText:
            '            objectFit="cover"\n            objectPosition={cropPosition(image.width, image.height)}',
        },
      ],
    },
    "Successfully replaced 1 block(s) in src/plugins/core/components/composer/attachments.tsx.",
    41_000,
    {
      details: {
        patch: TILE_PATCH,
        diff: TILE_DIFF,
        firstChangedLine: 173,
      },
    },
  ),
  ran(
    "c-typecheck-ok",
    "bash",
    { command: "bun run typecheck" },
    TYPECHECK_CLEAN,
    46_000,
  ),
  {
    ...answer("a-anchor", PREVIEW_FIX_ANSWER, {
      reasoning:
        "The compile said what I should have known: this renderer puts the fit on the image element, not in `StyleDesc`, so the anchor goes beside `objectFit` and the style object stays as it was. The anchor is computed from the frame's two dimensions, which `identify` gave me, so there is no per-photo table and no metadata read.",
    }),
    usage: usage(31_600, 4_820, 0, 7, 10),
  },
];

export const PREVIEW_TURN: TranscriptItem[] = [
  userTurn(
    "u-preview",
    "now open the swimmer and the river from disk in the preview and tell me which one of them the panel crops",
    14,
  ),
  ran(
    "c-read-swimmer",
    "read",
    { path: photo("swimmer").path },
    "Read image file [image/jpeg]",
    61_000,
    { image: photoFile("swimmer") },
  ),
  ran(
    "c-read-river",
    "read",
    { path: photo("river").path },
    "Read image file [image/jpeg]",
    66_000,
    { image: photoFile("river") },
  ),
  ran(
    "c-ls-pictures",
    "bash",
    { command: "ls -l ~/Pictures/2026" },
    LS_PICTURES,
    71_000,
  ),
  {
    ...answer("a-preview", PREVIEW_COMPARE),
    usage: usage(16_400, 3_180, 0, 15, 16),
  },
];

export const RELEASE_TURN: TranscriptItem[] = [
  userTurn(
    "u-release",
    "the portrait doesn't belong in a 16:9 sheet, it's the only 3:4 in the folder. write the release note for the strip and the preview, in the README's voice — one behaviour, the three places a photo lands, and what it costs",
    27,
  ),
  // The note as a file: the row paints the file the model wrote, and the tool's
  // own "Successfully wrote to …" line is never painted.
  ran(
    "c-write-release",
    "write",
    { path: "RELEASE_NOTES.md", content: PREVIEW_RELEASE_NOTES },
    "Successfully wrote to RELEASE_NOTES.md",
    76_000,
  ),
  {
    ...answer("a-release", PREVIEW_RELEASE_ANSWER),
    usage: usage(15_400, 5_820, 0, 28, 31),
  },
];

// The decode in flight: it opened a couple of seconds after the prompt, so the
// status bar's live speed is the rate it has streamed at, and the scene's own
// clock (clockOf) answers a moment and a half later.
export const STREAM_TURN: TranscriptItem[] = [
  userTurn("u-stream", "and the same paragraph for the read preview", 33),
  answer("a-stream", PREVIEW_STREAM, {
    streaming: true,
    startTs: at(min(33) + 2_000),
  }),
];

export const SESSION_ITEMS: TranscriptItem[] = [
  { kind: "system", id: "s-open", text: SESSION_START_TEXT },
  ...PHOTOS_TURN,
  ...STRIP_FIX_TURN,
  ...PREVIEW_TURN,
  ...RELEASE_TURN,
];

// The photo-strip session is the hero scene: `Chat/session` and the preview
// pane of `Sessions/list`. Every other scene now writes its own conversation —
// see the rest of this folder — so no two README screens show one log.
