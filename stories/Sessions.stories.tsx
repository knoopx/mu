import { defineMeta } from "storybook";
import { ChatApp } from "../src/plugins/core/screens/Chat";
import { pickMode } from "../src/plugins/core/lib/composer/mode";
import { sessionRows } from "../src/plugins/core/lib/session/sessionList";
import { chat, chromeStory } from "../.storybook/chrome/chat";
import { SESSIONS_FIXTURE } from "../.storybook/fixtures/sessions";
import { SESSION_PICK_ITEMS } from "../.storybook/fixtures/scenes/session-name";
import { SESSION_ITEMS } from "../.storybook/fixtures/scenes/photo-strip";

const meta = defineMeta({
  title: "Sessions",
  component: ChatApp,
});
export default meta;

const sessions = sessionRows(SESSIONS_FIXTURE);

export const list = chromeStory("list", () =>
  chat({
    items: SESSION_PICK_ITEMS,
    initialMode: pickMode("session"),
    sessions,
    sessionPreviews: {
      [sessions[0].path]: {
        label: sessions[0].label,
        age: sessions[0].age,
        items: SESSION_ITEMS,
        empty: false,
      },
    },
  }),
);
