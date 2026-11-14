/**
 * The whole window: the log, the composer band, and the bar under it, painted
 * together by the app's own screen.
 *
 * This is the stage a person looks at. The parts are tested where they live
 * (`test/ui/logRows` for the rows, `test/ui/composerPanels` for the panels,
 * `test/ui/sessionStatus` for the bar); what belongs to the window is how they
 * stand together — one page of ink, the running mark hung beside the composer
 * rather than written as a line of prose, and every figure the bar keeps in view
 * inside the width it was given.
 */

import type { JSX } from "react";
import { useWindowSize } from "@gpuix/react";
import type { SessionTreeNode } from "@earendil-works/pi-coding-agent";
import {
  ChatApp,
  type ChatAppProps,
} from "../../src/plugins/core/screens/Chat";
import type { TranscriptItem } from "../../src/plugins/core/lib/agent/transcriptState";
import type { ComposerMode } from "../../src/plugins/core/lib/composer/mode";
import type { SessionListRow } from "../../src/plugins/core/lib/session/sessionList";
import { stubChatSession, stubSessionList } from "../chatSource";
import { clockOf } from "../fixtures/turn";
import { contextUsedOf } from "../fixtures/context";
import type { ChatSessionMeta } from "../../src/plugins/core/lib/session/chatSession";
import { stage, type Screen, type StageOptions } from "../harness";

export interface WindowScene {
  items?: TranscriptItem[];
  streaming?: boolean;
  mode?: ComposerMode;
  draft?: string;
  tree?: { tree: SessionTreeNode[]; leafId: string | null };
  now?: number;
  /** The sessions the history panel lists — a folder's own past. */
  sessionRows?: readonly SessionListRow[];
}

/** Paint the app's screen with one session in it, at the size a window is used at. */
export const chatWindow = async (
  scene: WindowScene = {},
  options: StageOptions = {},
): Promise<Screen> => {
  const items = scene.items ?? [];
  const { session } = stubChatSession({
    items,
    streaming: scene.streaming,
    meta: {
      model: "openrouter/anthropic/claude-sonnet-4.5",
      thinking: "xhigh",
      contextUsed: contextUsedOf(items),
      contextTotal: 200_000,
    } satisfies ChatSessionMeta,
    tree: scene.tree,
  });
  const props: ChatAppProps = {
    cwd: process.cwd(),
    now: scene.now ?? clockOf(items),
    openSession: () => Promise.resolve(session),
    sessionList: stubSessionList({ rows: [...(scene.sessionRows ?? [])] }),
    ...(scene.mode === undefined ? {} : { initialMode: scene.mode }),
    ...(scene.draft === undefined ? {} : { initialInput: scene.draft }),
  };
  return stage(<Window {...props} />, { width: 1280, height: 800, ...options });
};

/** The window's own root: a column the size of the window it was opened at.
 *  The app's screen lays out against the band it is given, so a stage that left
 *  it unsized would measure a collapsed log and call it a window. */
function Window(props: ChatAppProps): JSX.Element {
  const size = useWindowSize();
  return (
    <div
      style={{
        width: size?.width ?? 1280,
        height: size?.height ?? 800,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ChatApp {...props} />
    </div>
  );
}
