/**
 * snapcompact — a compaction that photocopies the span it drops.
 *
 * It registers no tool and no log row: its whole surface is one pi extension hook
 * that runs inside the session, and the frames it makes are read back by the
 * session tree and the transcript's compaction note.
 */

import { definePlugin } from "../core/lib/plugin/manifest";
import { snapcompactExtension } from "./lib/extension";

export const snapcompactPlugin = definePlugin(
  "snapcompact",
  {
    title: "Snapcompact",
    summary:
      "Compaction that photocopies the discarded span into dense pages a vision model reads back.",
    icon: "token",
    category: "session",
  },
  (app) => {
    app.extensions.register(snapcompactExtension);
  },
);
