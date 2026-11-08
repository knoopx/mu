import type {
  ContextEvent,
  ExtensionAPI,
  ExtensionFactory,
} from "@earendil-works/pi-coding-agent";

import { ARCHIVE_MESSAGE_TYPE } from "../constants";
import type { SnapcompactConfig } from "../types";
import { latestSnapcompactDetails } from "./archive";
import { readSnapcompactConfig } from "./config";
import { loadSnapcompact } from "./load";
import { planSnapcompact } from "./plan";
import { readerSeesImages } from "./reader";
import { archiveMessage, replayArchive } from "./replay";

/**
 * snapcompact, wired into pi's compaction lifecycle.
 *
 * Two hooks, and they are pi's own — mu registers an extension factory exactly
 * as it registers guardrails and codemode, and pi stays the thing that decides
 * *when* a context needs compacting:
 *
 * - `session_before_compact` replaces pi's summarization call with a local
 *   render: the turns about to be discarded become pages of text and the frames
 *   ride in the compaction entry's `details`. Nothing is billed for it.
 * - `context` puts those pages back in front of the model on every request,
 *   because pi rebuilds the request from the session file each time and the
 *   summary alone would point at pages that are no longer there.
 *
 * Both fall through to pi's own path whenever the picture is wrong: a reader
 * that takes no images gets pi's written summary (it has nothing to read a page
 * with), an unreadable config file means the default of trying at all, and a
 * renderer that will not load means the fallback, quietly, everywhere.
 */
export const snapcompactExtension: ExtensionFactory = (
  pi: ExtensionAPI,
): void => {
  let config: SnapcompactConfig = readSnapcompactConfig();

  // mu hot-reloads its own files: a switch flipped while the window is open
  // takes the next session, and the next compaction of this one.
  pi.on("session_start", () => {
    config = readSnapcompactConfig();
  });

  pi.on("session_before_compact", async (event, ctx) => {
    if (!config.enabled) return undefined;
    const model = ctx.model;
    if (model === undefined || !readerSeesImages(model)) return undefined;
    // `/compact focus on the migration` asks for a *reading* of the history, and
    // an archive is deliberately not one: it keeps what was said. A focused
    // compaction goes to pi's summarizer, which is the only thing here that reads.
    if (event.customInstructions !== undefined) return undefined;

    const snap = await loadSnapcompact();
    if (snap === undefined) return undefined;

    const previous = latestSnapcompactDetails(event.branchEntries);
    const plan = await planSnapcompact(snap, event.preparation, {
      model,
      config,
      previous,
    }).catch(() => undefined);
    if (plan === undefined || event.signal.aborted) return undefined;
    // The layout keeps the oldest and newest turns as text and images only the
    // middle. A span with no middle compressed nothing, and pi's summary of it
    // would be the smaller context — so mu does not claim the pass.
    if (plan.pass.frames === 0) return undefined;

    return {
      compaction: {
        summary: plan.summary,
        firstKeptEntryId: plan.firstKeptEntryId,
        tokensBefore: plan.tokensBefore,
        details: plan.details,
      },
    };
  });

  pi.on("context", async (event, ctx) => {
    const details = latestSnapcompactDetails(
      ctx.sessionManager.buildContextEntries(),
    );
    if (details === undefined) return undefined;

    const index = event.messages.findIndex(
      (message) => message.role === "compactionSummary",
    );
    if (index < 0) return undefined;
    if (
      event.messages.some(
        (message) =>
          message.role === "custom" &&
          message.customType === ARCHIVE_MESSAGE_TYPE,
      )
    ) {
      return undefined;
    }

    const model = ctx.model;
    if (model === undefined) return undefined;

    // A resumed session has the archive in its file and nothing in memory, so
    // this is the one place mu pays for the renderer on a turn's behalf. It pays
    // it once, and only for a session that really was archived as pages.
    const snap = await loadSnapcompact();
    if (snap === undefined) return undefined;

    const archived = event.messages[index];
    if (archived?.role !== "compactionSummary") return undefined;

    const blocks = replayArchive(snap, details, archived.summary, model);
    const messages: ContextEvent["messages"] = [...event.messages];
    messages.splice(index, 1, archiveMessage(blocks, archived.timestamp));
    return { messages };
  });
};
