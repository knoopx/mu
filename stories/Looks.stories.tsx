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
import { THEME_ITEMS } from "../.storybook/fixtures/scenes/looks-rules";
import { ACCENT_ITEMS } from "../.storybook/fixtures/scenes/looks-accent";

const meta = defineMeta({
  title: "Looks",
  component: ChatApp,
});
export default meta;

const THEME_CURSOR = new Map(
  themeRows("").map((row, index) => [row.key as ColorScheme, index]),
);

const ACCENT_CURSOR = accentRows("", "light").findIndex(
  (row) => row.key === "orange",
);

// The `Looks` row is a theme comparison: one session, four looks. It only
// reads as a comparison when the screen underneath is identical, so these
// stories deliberately share a transcript — the theme is the variable, and
// `checkUnique` counts the theme as part of the screen.
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
  chat({ items: THEME_ITEMS, initialMode: themePicker("light") }),
);

export const dark = themeStory("dark", "dark", () =>
  chat({ items: THEME_ITEMS, initialMode: themePicker("dark") }),
);

export const nightsky = themeStory("nightsky", "nightsky", () =>
  chat({ items: THEME_ITEMS, initialMode: themePicker("nightsky") }),
);

export const accents = chromeStory(
  "accents",
  () => chat({ items: ACCENT_ITEMS, initialMode: accentPicker }),
  themeStage("light", "orange"),
);
