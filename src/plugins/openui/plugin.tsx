/**
 * openui — eleven tools and the screens they paint.
 *
 * A program is the one answer drawn without the band: a `Pane` is filled with the
 * plate's own colour, so a band under a screen is a card inside a card and its
 * panes read as nothing. The plugin says so with `frame: "page"`, which is the only
 * exception to the band a plugin may register.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { openUIClearTool } from "./tools/openuiClear";
import { openUIEventsTool } from "./tools/openuiEvents";
import { openUILibraryTool } from "./tools/openuiLibrary";
import { openUIListTool } from "./tools/openuiList";
import { openUIPromptTool } from "./tools/openuiPrompt";
import { openUIRenderTool } from "./tools/openuiRender";
import { openUIStateTool } from "./tools/openuiState";
import { openUIStreamTool } from "./tools/openuiStream";
import { openUISwitchTool } from "./tools/openuiSwitch";
import { openUIToolsTool } from "./tools/openuiTools";
import { openUIValidateTool } from "./tools/openuiValidate";
import {
  isOpenUITool,
  openUIToolPreviewOf,
  OpenUIToolRows,
} from "./components/OpenUIToolRows";

export const openUIPlugin = definePlugin(
  "openui",
  {
    title: "Generative UI",
    summary:
      "Screens the agent writes and you operate, with a form's answers landing in your own message.",
    icon: "widgets",
    category: "surface",
  },
  (app) => {
    app.tools.register(
      openUIPromptTool,
      openUILibraryTool,
      openUIValidateTool,
      openUIRenderTool,
      openUIStreamTool,
      openUIStateTool,
      openUIEventsTool,
      openUIToolsTool,
      openUIListTool,
      openUISwitchTool,
      openUIClearTool,
    );

    app.log.rows({
      key: "openui",
      owns: isOpenUITool,
      frame: "page",
      body: (item) => <OpenUIToolRows item={item} />,
      preview: openUIToolPreviewOf,
    });
  },
);
