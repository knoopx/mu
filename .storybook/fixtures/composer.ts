import { HOST } from "../../src/plugins/registry";
import { commandSurfaces } from "../../src/plugins/core/lib/plugin/surfaces";
import {
  accentRows,
  themeRows,
} from "../../src/plugins/core/lib/theme/themeRows";
import {
  attachmentOf,
  type ComposerAttachment,
} from "../../src/plugins/core/components/composer/attachments";
import {
  commandRows,
  modelRows,
  thinkingRows,
} from "../../src/plugins/core/lib/composer/options";
import { iconForFile } from "../../src/plugins/core/lib/files/fileIcons";
import {
  userMessageHistoryRows,
  type UserMessage,
} from "../../src/plugins/core/lib/composer/userMessageHistory";
import type {
  ComposerPanelRow,
  ComposerPreviewSpec,
} from "../../src/plugins/core/components/composer/Composer";
import { MOCK_BRIDGE } from "./models";
import { photoBuffer, photoOf, totalBytes, type PhotoKey } from "./media";

export const COMPOSER_COMMAND_ROWS: ComposerPanelRow[] = commandRows(
  commandSurfaces(HOST),
);

export const COMPOSER_MODEL_ROWS: ComposerPanelRow[] = modelRows(
  MOCK_BRIDGE,
  "",
);

export const COMPOSER_THINKING_ROWS: ComposerPanelRow[] = thinkingRows(
  MOCK_BRIDGE,
  "",
);

export const COMPOSER_THEME_ROWS: ComposerPanelRow[] = themeRows("");

export const COMPOSER_ACCENT_ROWS: ComposerPanelRow[] = accentRows(
  "",
  "nightsky",
);

const MINUTE = 60_000;
const HISTORY_NOW = Date.now();

const prompt = (
  id: string,
  sessionName: string,
  text: string,
  minutesAgo: number,
): UserMessage => ({
  id,
  text,
  ts: HISTORY_NOW - minutesAgo * MINUTE,
  session: sessionName,
});

const PHOTOS = "photo strip crop";
const PANEL = "ask panel rows";
const MEDIA = "pasted screenshots";

export const USER_MESSAGE_FIXTURE: UserMessage[] = [
  prompt(
    "u-18",
    PHOTOS,
    "capture the chat story and tell me what the strip shows now",
    24,
  ),
  prompt(
    "u-17",
    PHOTOS,
    "anchor the strip top for a portrait frame, centre for a wide one, keep 48px",
    41,
  ),
  prompt(
    "u-16",
    PHOTOS,
    "the star trails lose the ridge and the portrait loses the skyline",
    58,
  ),
  prompt("u-15", PHOTOS, "!!identify ~/Pictures/2026/*.jpg", 66),
  prompt("u-14", PHOTOS, "!ls -l ~/Pictures/2026", 70),
  prompt(
    "u-13",
    PANEL,
    "the ask panel is one row short — the last option sits under the hint bar",
    130,
  ),
  prompt(
    "u-12",
    PANEL,
    "reserve the hint strip, keep the four-row floor, do not touch panelHeight.ts",
    148,
  ),
  prompt("u-11", PANEL, "run the gate", 162),
  prompt(
    "u-10",
    MEDIA,
    "the preview must show the whole photo, the strip may crop",
    320,
  ),
  prompt(
    "u-9",
    MEDIA,
    "paste a screenshot with Ctrl+V and the agent must see the pixels",
    402,
  ),
  prompt(
    "u-8",
    MEDIA,
    "the read preview stretches the portrait, keep the aspect",
    455,
  ),
  prompt(
    "u-7",
    PANEL,
    "the tree panel and the ask panel should share the band",
    980,
  ),
  prompt("u-6", PANEL, "is the four-row floor ever wrong?", 1010),
  prompt("u-5", MEDIA, "image tiles: 48px, cover, and never letterboxed", 1640),
  prompt(
    "u-4",
    PANEL,
    "status bar: turns, tokens, wall time, tokens per second, cost",
    2100,
  ),
  prompt("u-3", MEDIA, "context ring: orange at 70%, red at 90%", 2760),
  prompt(
    "u-2",
    PANEL,
    "ask-user: the footer is the hint bar only, no buttons",
    3410,
  ),
  prompt(
    "u-1",
    MEDIA,
    "derive the theme from the scheme and accent, no literals",
    4020,
  ),
];

export const COMPOSER_USER_MESSAGE_HISTORY_ROWS: ComposerPanelRow[] =
  userMessageHistoryRows(USER_MESSAGE_FIXTURE, "");

export const COMPOSER_FILE_PATHS: string[] = [
  "README.md",
  "app.tsx",
  "package.json",
  "src/plugins/core/components/media.ts",
  "src/plugins/core/components/ReadPreview.tsx",
  "src/plugins/core/components/composer/attachments.tsx",
  "src/plugins/core/components/composer/Composer.tsx",
  "src/plugins/core/components/composer/panelHeight.ts",
  "src/plugins/core/screens/Chat.tsx",
  "stories/Chat.stories.tsx",
  "stories/Composer.stories.tsx",
];

export const COMPOSER_FILE_ROWS: ComposerPanelRow[] = COMPOSER_FILE_PATHS.map(
  (path) => ({
    kind: "option",
    key: path,
    label: path,
    icon: iconForFile(path),
  }),
);

export const COMPOSER_FILE_PREVIEW: ComposerPreviewSpec = {
  path: "src/plugins/core/components/media.ts",
  lines: [
    "export function baseType(mimeType: string): string {",
    "  return (mimeType.split(';')[0] ?? mimeType).trim().toLowerCase();",
    "}",
    "",
    "export function mediaKind(mimeType: string): string {",
    "  const base = baseType(mimeType);",
    "  const subtype = base.startsWith('image/')",
    "    ? base.slice('image/'.length)",
    "    : base;",
    "  return subtype.replace(/^x-/, '').replace(/\\+xml$/, '');",
    "}",
    "",
    "export const TILE_FIT = 'cover';",
    "export const PREVIEW_FIT = 'contain';",
  ],
};

const attachment = (key: PhotoKey): ComposerAttachment =>
  attachmentOf(photoBuffer(key), "image/jpeg");

export const COMPOSER_ATTACHMENTS: ComposerAttachment[] = [
  attachment("meadow"),
  attachment("stars"),
];

export const PASTED_PHOTOS: ComposerAttachment[] = [
  attachment("meadow"),
  attachment("stars"),
  attachment("bay"),
];

export const PASTED_IMAGES = PASTED_PHOTOS.map((attachment) => ({
  src: attachment.src,
  mimeType: attachment.mimeType,
  bytes: attachment.bytes,
}));

export const STRIP_IMAGES = COMPOSER_ATTACHMENTS.map((attachment) => ({
  src: attachment.src,
  mimeType: attachment.mimeType,
  bytes: attachment.bytes,
}));

export const PASTED_TOTAL_BYTES = totalBytes(["meadow", "stars", "bay"]);

export const PASTED_SUMMARY = PASTED_PHOTOS.map((_, i) => {
  const keys: PhotoKey[] = ["meadow", "stars", "bay"];
  const photo = photoOf(keys[i]);
  return `${photo.name} ${photo.width}×${photo.height}`;
}).join(", ");
