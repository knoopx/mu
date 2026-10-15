import { defineMeta } from "storybook";
import type { ColorScheme } from "adwaita-gpuix";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import type { ComposerMode } from "../src/plugins/core/lib/composer/mode";
import { accentRows, themeRows } from "../src/plugins/core/lib/theme/themeRows";
import {
  chat,
  chromeStory,
  themeStage,
  themeStory,
} from "../.storybook/chrome/chat";
import { PHOTOS_TURN } from "../.storybook/fixtures/scenes/photo-strip";

const meta = defineMeta({
  title: "Looks",
  component: ChatApp,
});
export default meta;

const THEME_CURSOR = new Map(
  themeRows("").map((row, index) => [row.key as ColorScheme, index]),
);

const ACCENT_CURSOR = accentRows("", "nightsky").findIndex(
  (row) => row.key === "orange",
);

const themePicker = (scheme: ColorScheme): ComposerMode => ({
  kind: "pick",
  target: "theme",
  index: THEME_CURSOR.get(scheme) ?? 0,
  query: "",
});

const accentPicker: ComposerMode = {
  kind: "pick",
  target: "accent",
  index: ACCENT_CURSOR,
  query: "",
};

export const light = themeStory("light", "light", () =>
  chat({ items: PHOTOS_TURN, initialMode: themePicker("light") }),
);

export const dark = themeStory("dark", "dark", () =>
  chat({ items: PHOTOS_TURN, initialMode: themePicker("dark") }),
);

export const nightsky = themeStory("nightsky", "nightsky", () =>
  chat({ items: PHOTOS_TURN, initialMode: themePicker("nightsky") }),
);

export const accents = chromeStory(
  "accents",
  () => chat({ items: PHOTOS_TURN, initialMode: accentPicker }),
  themeStage("nightsky", "orange"),
);
