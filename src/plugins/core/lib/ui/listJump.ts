import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useGpuixRequired, type PublicInstance } from "@gpuix/react";
import type { EventPayload } from "@gpuix/native";
import { canonicalKey } from "adwaita-gpuix";
import { parseKey } from "../../../../keys";
import { getKeybindings } from "../../../../keybindings/manager";
import { addInputListener } from "../../../../window/window";

export type JumpDirection = -1 | 1;

const SETTLE_PASSES = 2;

export function jumpTargetRow(
  targets: readonly number[],
  topRow: number,
  direction: JumpDirection,
): number | null {
  if (targets.length === 0) return null;
  if (direction < 0) {
    for (let i = targets.length - 1; i >= 0; i -= 1)
      if (targets[i] < topRow) return targets[i] as number;
    return targets[0] as number;
  }
  for (let i = 0; i < targets.length; i += 1)
    if (targets[i] > topRow) return targets[i] as number;
  return targets[targets.length - 1] as number;
}

function matchesBinding(event: EventPayload, id: string): boolean {
  const parsed = parseKey(getKeybindings().get(id));
  const mods = event.modifiers;
  return (
    canonicalKey(event.key ?? "") === parsed.key &&
    (mods?.ctrl === true) === parsed.ctrl &&
    (mods?.shift === true) === parsed.shift &&
    (mods?.alt === true) === parsed.alt &&
    (mods?.cmd === true) === parsed.cmd
  );
}

export interface ListJumpOptions {
  listRef: { current: PublicInstance | null };

  targets: readonly number[];

  enabled: boolean;

  bindings: { prev: string; next: string };

  onJump?: (target: number, isEnd: boolean) => void;
}

export interface ListJump {
  jump: (direction: JumpDirection) => boolean;

  onVisibleRange: (event: EventPayload) => void;
}

export function useListJump(options: ListJumpOptions): ListJump {
  const { listRef, targets, enabled, bindings, onJump } = options;
  const renderer = useGpuixRequired();

  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onJumpRef = useRef(onJump);
  onJumpRef.current = onJump;

  const topRowRef = useRef<number | null>(null);
  const pendingRef = useRef<number | null>(null);
  const passesRef = useRef(0);
  const [request, setRequest] = useState<{
    target: number;
    seq: number;
  } | null>(null);
  const seqRef = useRef(0);

  const scrollTo = useCallback(
    (target: number): boolean => {
      const id = listRef.current?.id;
      if (id === undefined) return false;
      renderer.scrollToItem?.(id, target, 0);
      return true;
    },
    [listRef, renderer],
  );

  const anchorRow = useCallback((): number => {
    const id = listRef.current?.id;
    if (id === undefined) return 0;
    const anchor = renderer.getListScrollTop?.(id);
    return anchor != null && anchor.length > 0 ? (anchor[0] ?? 0) : 0;
  }, [listRef, renderer]);

  const jump = useCallback(
    (direction: JumpDirection): boolean => {
      if (enabledRef.current === false) return false;
      const stops = targetsRef.current;
      if (stops.length < 2) return false;
      const pending = pendingRef.current;
      const base = pending ?? topRowRef.current ?? anchorRow();
      const target = jumpTargetRow(stops, base, direction);
      if (target === null) return false;
      pendingRef.current = target;
      passesRef.current = 0;
      onJumpRef.current?.(
        target,
        target >= (stops[stops.length - 1] as number),
      );
      seqRef.current += 1;
      setRequest({ target, seq: seqRef.current });
      return true;
    },
    [anchorRow],
  );

  const jumpRef = useRef(jump);
  jumpRef.current = jump;

  useLayoutEffect(() => {
    if (request === null) return;
    scrollTo(request.target);
  }, [request, scrollTo]);

  const onVisibleRange = useCallback(
    (event: EventPayload): void => {
      const start = event.startIndex;
      if (typeof start !== "number") return;
      topRowRef.current = start;
      const pending = pendingRef.current;
      if (pending === null) return;
      if (start === pending) {
        pendingRef.current = null;
        return;
      }
      if (passesRef.current < SETTLE_PASSES) {
        passesRef.current += 1;
        scrollTo(pending);
      } else pendingRef.current = null;
    },
    [scrollTo],
  );

  useEffect(
    () =>
      addInputListener((event) => {
        if (matchesBinding(event, bindings.prev)) jumpRef.current(-1);
        else if (matchesBinding(event, bindings.next)) jumpRef.current(1);
      }),
    [bindings.prev, bindings.next],
  );

  return { jump, onVisibleRange };
}
