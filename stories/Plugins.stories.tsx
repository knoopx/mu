import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { pickMode } from "../src/plugins/core/lib/composer/mode";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { PLUGIN_LIST_ITEMS } from "../.storybook/fixtures/scenes/plugin-list";

const meta = defineMeta({
  title: "Plugins",
  component: ChatApp,
});
export default meta;

/**
 * The app describing itself: thirteen plugins and, on each row, the registrations
 * the host watched happen — tools, panels, commands, log surfaces, extensions and
 * the guardrails block — so the panel cannot drift from the build. The arming the
 * rows show is the user's own file, read before the host was built, and the status
 * line says where it lives and when a switch takes effect.
 */
export const list = chromeStory("list", () =>
  chat({
    items: PLUGIN_LIST_ITEMS,
    initialMode: pickMode("plugins"),
  }),
);
