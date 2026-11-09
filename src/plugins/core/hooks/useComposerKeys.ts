import { useEffect, useRef } from "react";
import type { EventPayload } from "@gpuix/native";
import { useGpuixRequired, type PublicInstance } from "@gpuix/react";
import { addInputListener } from "../../../window/window";
import {
  isCompletionMode,
  panelIndex,
  transition,
  type ComposerEvent,
  type ComposerMode,
  type PickIntent,
} from "../lib/composer/mode";
import {
  composerFieldKey,
  composerGlobalKey,
  composerListKey,
  ownsFocus,
  panelOwner,
  type ComposerKeyContext,
} from "../lib/composer/keyRouter";
import { PANEL_DEFAULT_VISIBLE } from "../lib/composer/panelHeight";
import type {
  ComposerPanelRow,
  ComposerPanelSpec,
} from "../components/composer/Composer";

export interface ComposerKeyOptions {
  mode: ComposerMode;
  panel?: ComposerPanelSpec;

  panelOpen: boolean;
  wideOpen: boolean;
  value: string;
  isStreaming: boolean;

  onChange(value: string): void;
  onMode(mode: ComposerMode): void;
  onAbort(): void;

  onHistory?(): void;
  onClear?(): void;
  onPaste?(): void;
  onComplete?(): void;
}

export interface ComposerKeyHandlers {
  onText(next: string): void;
  onFieldKey(event: EventPayload): void;
  onListKey(event: EventPayload): void;
  pickActive(intent: PickIntent): void;
  captureField(node: PublicInstance | null): void;
  capturePanel(node: PublicInstance | null): void;
}

const rowUnderCursor = (
  panel: ComposerPanelSpec,
  mode: ComposerMode,
): ComposerPanelRow | undefined =>
  panel.rows[panelIndex(mode, panel.rows.length)];

export function useComposerKeys(opts: ComposerKeyOptions): ComposerKeyHandlers {
  const renderer = useGpuixRequired();
  const { mode, panel, panelOpen, wideOpen } = opts;
  const count = panel?.rows.length ?? 0;
  const maxVisible = panel?.maxVisible ?? PANEL_DEFAULT_VISIBLE;
  // The completion panel's query is the draft, so every keystroke in it writes
  // the draft too: closing the panel keeps what was typed.
  const draftIsQuery = isCompletionMode(mode);

  const send = (event: ComposerEvent): void => {
    opts.onMode(transition(mode, event));
  };

  const onText = (next: string): void => {
    if (mode.kind === "draft") {
      opts.onChange(next);
      return;
    }
    if (draftIsQuery) opts.onChange(next);
    send({ type: "setQuery", query: next });
  };

  const pickActive = (intent: PickIntent): void => {
    if (panel === undefined) return;
    const row = rowUnderCursor(panel, mode);
    if (row !== undefined) panel.onPick(row, intent);
  };

  const deleteActive = (): void => {
    if (panel?.onDelete === undefined) return;
    const row = rowUnderCursor(panel, mode);
    if (row !== undefined) panel.onDelete(row);
  };

  const openActive = (): void => {
    if (panel?.onOpen === undefined) return;
    const row = rowUnderCursor(panel, mode);
    if (row !== undefined) panel.onOpen(row);
  };

  const fieldNode = useRef<number | null>(null);
  const panelNode = useRef<number | null>(null);
  const captureField = (node: PublicInstance | null): void => {
    fieldNode.current = node?.id ?? null;
  };
  const capturePanel = (node: PublicInstance | null): void => {
    panelNode.current = node?.id ?? null;
  };

  const panelOwnerKey = panelOwner(mode, panelOpen);

  useEffect(() => {
    if (panelOpen === false) return;
    const id = panelNode.current;
    if (id === null) return;
    renderer.focusElement?.(id);
  }, [panelOpen, panelOwnerKey, renderer]);

  const keyCtx: ComposerKeyContext = {
    mode,
    panelOpen,
    wideOpen,
    isStreaming: opts.isStreaming,
    value: opts.value,
    count,
    maxVisible,
    send,
    pickActive,
    onComplete: opts.onComplete,
    onDraft: draftIsQuery ? opts.onChange : undefined,
    onDelete: panel?.onDelete === undefined ? undefined : deleteActive,
    onOpen: panel?.onOpen === undefined ? undefined : openActive,
    onClear: opts.onClear,
    onPaste: opts.onPaste,
    onAbort: opts.onAbort,
    onHistory: opts.onHistory,
    wideKey: panel?.wide?.onKey,
    renderer,
    listOwnsFocus: () => ownsFocus(panelNode.current, renderer),
    fieldOwnsFocus: () => ownsFocus(fieldNode.current, renderer),
  };

  const onGlobalKey = (event: EventPayload): boolean =>
    composerGlobalKey(event, keyCtx);
  const globalKeyRef = useRef(onGlobalKey);
  globalKeyRef.current = onGlobalKey;

  useEffect(
    () => addInputListener((event) => void globalKeyRef.current(event)),
    [],
  );

  return {
    onText,
    onFieldKey: (event) => composerFieldKey(event, keyCtx),
    onListKey: (event) => composerListKey(event, keyCtx),
    pickActive,
    captureField,
    capturePanel,
  };
}
