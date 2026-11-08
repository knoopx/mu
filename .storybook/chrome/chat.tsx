import type { JSX, ReactNode } from "react";
import type { SessionTreeNode } from "@earendil-works/pi-coding-agent";
import type { AccentKey, ColorScheme } from "adwaita-gpuix";
import { defineStory, type Parameters } from "storybook";
import {
  ChatApp,
  type ChatAppProps,
} from "../../src/plugins/core/screens/Chat";
import { askStore } from "../../src/plugins/interaction/lib/store";
import type { AskQuestion } from "../../src/plugins/interaction/types";
import type { TranscriptItem } from "../../src/plugins/core/lib/agent/transcriptState";
import type { ChatSessionMeta } from "../../src/plugins/core/lib/session/chatSession";
import type {
  SessionListRow,
  SessionPreviewData,
} from "../../src/plugins/core/lib/session/sessionList";
import type { ComposerPanelRow } from "../../src/plugins/core/components/composer/Composer";
import type { ComposerAttachment } from "../../src/plugins/core/components/composer/attachments";
import { stubChatSession, stubSessionList } from "../chatSource";
import { contextAtPercent, sceneContext } from "../fixtures/models";
import { contextUsedOf } from "../fixtures/context";
import { clockOf } from "../fixtures/turn";

export const STAGE: Parameters = {};

export const STAGE_SCHEME: ColorScheme = "nightsky";

export interface StageTheme {
  scheme: ColorScheme;
  accent: AccentKey | null;
}

export function themeStage(
  scheme: ColorScheme,
  accent: AccentKey | null = null,
): Parameters {
  return { scheme, accent };
}

export function stageTheme(parameters: Parameters = STAGE): StageTheme {
  return {
    scheme: (parameters.scheme as ColorScheme | undefined) ?? STAGE_SCHEME,
    accent: (parameters.accent as AccentKey | null | undefined) ?? null,
  };
}

export function chromeStory(
  name: string,
  render: () => JSX.Element,
  parameters: Parameters = STAGE,
) {
  return defineStory({ name, render, parameters });
}

export function themeStory(
  name: string,
  scheme: ColorScheme,
  render: () => JSX.Element,
  parameters: Parameters = STAGE,
) {
  return chromeStory(name, render, { ...parameters, ...themeStage(scheme) });
}

export interface ChatStoryProps extends Omit<
  ChatAppProps,
  "openSession" | "sessionList"
> {
  items?: TranscriptItem[];
  streaming?: boolean;

  meta?: ChatSessionMeta;

  context?: number;

  modelRows?: ComposerPanelRow[];
  thinkingRows?: ComposerPanelRow[];
  sessions?: SessionListRow[];
  sessionPreviews?: Record<string, SessionPreviewData>;
  tree?: { tree: SessionTreeNode[]; leafId: string | null };
  draft?: string;
  attachments?: ComposerAttachment[];
}

export function chat(props: ChatStoryProps = {}): JSX.Element {
  const {
    items,
    streaming,
    meta,
    context,
    modelRows,
    thinkingRows,
    sessions,
    sessionPreviews,
    tree,
    draft,
    attachments,
    ...appProps
  } = props;
  const stageContext =
    meta ??
    (context === undefined
      ? sceneContext(contextUsedOf(items ?? []))
      : contextAtPercent(context));
  // A scene keeps its own clock: the status bar's figures are read at a moment,
  // and a running scene that read the wall clock would print a new PNG hourly.
  const stageNow = appProps.now ?? clockOf(items ?? []);

  const { session } = stubChatSession({
    items,
    streaming,
    meta: stageContext,
    modelRows,
    thinkingRows,
    tree,
  });
  return (
    <ChatApp
      {...appProps}
      now={stageNow}
      initialInput={draft}
      initialAttachments={attachments}
      openSession={() => Promise.resolve(session)}
      sessionList={stubSessionList({
        rows: sessions ?? [],
        previews: sessionPreviews,
      })}
    />
  );
}

export function askInChat(
  questions: AskQuestion[],
  items: TranscriptItem[],
  props: ChatStoryProps = {},
): JSX.Element {
  askStore.run(questions, undefined);
  return chat({ ...props, items });
}

export function overChat(props: ChatStoryProps, layer: ReactNode): JSX.Element {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {chat(props)}
      {layer}
    </div>
  );
}
