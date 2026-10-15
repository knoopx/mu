import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import {
  CAPTURE_ALL,
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
import { photoFile, photoOf } from "../media";
import { answer, failed, ran, running, usage } from "../turn";

export const AGENT_ROWS: TranscriptItem[] = [
  running("r-bash-running", "bash", { command: "bun storybook ." }),
  ran(
    "r-identify",
    "bash",
    { command: "identify ~/Pictures/2026/*.jpg" },
    IDENTIFY_PICTURES,
    2_000,
  ),
  ran("r-ls", "bash", { command: "ls -l ~/Pictures/2026" }, LS_PICTURES, 5_000),
  failed(
    "r-typecheck-fail",
    "bash",
    { command: "bun run typecheck" },
    TYPECHECK_NO_OBJECT_POSITION,
    9_000,
  ),
  ran(
    "r-grep",
    "grep",
    { pattern: "objectFit", path: "src" },
    GREP_OBJECT_FIT,
    14_000,
  ),
  ran(
    "r-read-styles",
    "read",
    {
      path: "src/plugins/core/components/composer/attachments.tsx",
      offset: 86,
      limit: 44,
    },
    READ_THUMB_STYLES,
    18_000,
  ),
  ran(
    "r-read-photo",
    "read",
    { path: photoOf("meadow").path },
    "Read image file [image/jpeg]",
    24_000,
    { image: photoFile("meadow") },
  ),
  ran(
    "r-read-preview",
    "read",
    {
      path: "src/plugins/core/components/composer/attachments.tsx",
      offset: 161,
      limit: 22,
    },
    READ_THUMB_STRIP,
    29_000,
  ),
  ran(
    "r-edit",
    "edit",
    {
      path: "src/plugins/core/components/composer/attachments.tsx",
      edits: [
        {
          oldText: '            objectFit="cover"',
          newText:
            '            objectFit="cover"\n            objectPosition={cropPosition(image.width, image.height)}',
        },
      ],
    },
    "Successfully replaced 1 block(s) in src/plugins/core/components/composer/attachments.tsx.",
    34_000,
    { details: { patch: TILE_PATCH, diff: TILE_DIFF, firstChangedLine: 173 } },
  ),
  ran(
    "r-typecheck-ok",
    "bash",
    { command: "bun run typecheck" },
    TYPECHECK_CLEAN,
    41_000,
  ),
  ran("r-capture", "bash", { command: "bun storybook ." }, CAPTURE_ALL, 47_000),
  {
    ...answer(
      "a-agent",
      "Every row is where it happened: the failed compile keeps its error, the photo read keeps the photo, the edit keeps its diff, and the capture output scrolls inside its row.",
    ),
    usage: usage(24_600, 2_880, 0, 5, 6),
  },
];
