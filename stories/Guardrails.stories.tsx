import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { pickMode } from "../src/plugins/core/lib/composer/mode";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { guardrailsScene } from "../.storybook/fixtures/guardrails";

const meta = defineMeta({
  title: "Guardrails",
  component: ChatApp,
});
export default meta;

export const triggered = chromeStory("triggered", () =>
  chat({
    items: guardrailsScene(),
    initialMode: pickMode("guardrails"),
  }),
);


