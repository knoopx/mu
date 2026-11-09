import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { CODEMODE_ITEMS } from "../.storybook/fixtures/scenes/codemode-run";

const meta = defineMeta({
  title: "Codemode",
  component: ChatApp,
});
export default meta;

/**
 * A script instead of eleven commands: pi's header stripped, the wall time as a
 * timing line, the printed text kept in pi's own separators, and the script's
 * own tool calls listed inside the row — numbered, one badged for the failure
 * it carried, which is where a guardrails block of a nested call surfaces.
 */
export const script = chromeStory("script", () =>
  chat({ items: CODEMODE_ITEMS }),
);
