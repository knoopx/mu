import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
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

/**
 * How a key asks to move the log: to the point before or after the one showing,
 * or to one of the two ends of it.
 */
export type JumpMove = JumpDirection | "start" | "end";

const SETTLE_PASSES = 2;

function jumpTargetRow(
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

export interface ListJumpBindings {
  prev: string;

  next: string;

  /** The key that sends the log to its first row, when it has one. */
  start?: string;

  /** The key that sends the log to its last row, when it has one. */
  end?: string;
}

export interface ListJumpOptions {
  listRef: { current: PublicInstance | null };

  targets: readonly number[];

  /**
   * The last row the list draws, which is where an end jump lands: 0 when the
   * log has nothing past its first row, and then has no end to jump to.
   */
  lastRow: number;

  enabled: boolean;

  bindings: ListJumpBindings;

  onJump?: (target: number, isEnd: boolean) => void;
}

export interface ListJump {
  jump: (move: JumpMove) => boolean;

  onVisibleRange: (event: EventPayload) => void;
}

/** The row a visible-range event reports, when the list reports one. */
function rangeStart(event: EventPayload): number | null {
  return typeof event.startIndex === "number" ? event.startIndex : null;
}

/**
 * What the list's latest report means for the jump still in flight: nothing is
 * jumping, the jump has landed, the list needs another push, or the jump gives
 * up rather than fight a row the list refuses to show.
 */
type JumpSettlement = "idle" | "arrived" | "nudge" | "give-up";

function settleJump(
  pending: number,
  start: number,
  passes: number,
): JumpSettlement {
  if (start === pending) return "arrived";
  return passes < SETTLE_PASSES ? "nudge" : "give-up";
}

/**
 * The row a jump asked the list to show, and how many times the list has been
 * asked. A list reports what it is showing after every scroll, and a jump is
 * only settled when the report agrees with the request.
 */
function useJumpTracker() {
  const topRow = useRef<number | null>(null);
  const pending = useRef<number | null>(null);
  const passes = useRef(0);

  const arm = useCallback((target: number): void => {
    pending.current = target;
    passes.current = 0;
  }, []);

  const settle = useCallback((): void => {
    pending.current = null;
  }, []);

  const report = useCallback((start: number): JumpSettlement => {
    topRow.current = start;
    const wanted = pending.current;
    if (wanted === null) return "idle";
    return settleJump(wanted, start, passes.current);
  }, []);

  /** Another push for the row still in flight, and how many it has had. */
  const nudge = useCallback((): number | null => {
    passes.current += 1;
    return pending.current;
  }, []);

  /** The row a new jump counts from: the one in flight, else the one shown. */
  const base = useCallback(
    (): number | null => pending.current ?? topRow.current,
    [],
  );

  return useMemo(
    () => ({ arm, settle, report, nudge, base }),
    [arm, settle, report, nudge, base],
  );
}

/** Whether the jump landed on the last stop, which is the end of the log. */
const isLastStop = (stops: readonly number[], target: number): boolean =>
  target >= (stops[stops.length - 1] as number);

/** Which way a key asks to move, when it is one of the jump bindings. */
function jumpMoveOf(
  event: EventPayload,
  bindings: ListJumpBindings,
): JumpMove | null {
  if (bindings.start !== undefined && matchesBinding(event, bindings.start))
    return "start";
  if (bindings.end !== undefined && matchesBinding(event, bindings.end))
    return "end";
  if (matchesBinding(event, bindings.prev)) return -1;
  if (matchesBinding(event, bindings.next)) return 1;
  return null;
}

export function useListJump(options: ListJumpOptions): ListJump {
  const { listRef, targets, lastRow, enabled, bindings, onJump } = options;
  const renderer = useGpuixRequired();

  const live = useRef({ targets, enabled, onJump, lastRow });
  live.current = { targets, enabled, onJump, lastRow };

  const tracker = useJumpTracker();
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

  /**
   * Send the list to a row, and say whether the log is now at its end.
   *
   * `chase` is whether the row is one the list can be nudged onto: a jump
   * between points asks again until the report agrees, because the heights on
   * the way there may still be estimates.
   */
  const moveTo = useCallback(
    (target: number, isEnd: boolean, chase: boolean): boolean => {
      if (chase === true) tracker.arm(target);
      live.current.onJump?.(target, isEnd);
      seqRef.current += 1;
      setRequest({ target, seq: seqRef.current });
      return true;
    },
    [tracker],
  );

  const jump = useCallback(
    (move: JumpMove): boolean => {
      if (live.current.enabled === false) return false;
      const stops = live.current.targets;

      if (move === "start" || move === "end") {
        const last = live.current.lastRow;
        if (last <= 0) return false;
        // Asking the list for the last row of the log is a request that runs
        // past what fits, so it shows the bottom it has and the report that
        // follows can never name the row that was asked for: there is nothing
        // to chase. The first row is a row the list can be nudged onto.
        return moveTo(
          move === "start" ? 0 : last,
          move === "end",
          move === "start",
        );
      }

      if (stops.length < 2) return false;
      const from = tracker.base() ?? anchorRow();
      const target = jumpTargetRow(stops, from, move);
      if (target === null) return false;
      return moveTo(target, isLastStop(stops, target), true);
    },
    [anchorRow, moveTo, tracker],
  );

  const jumpRef = useRef(jump);
  jumpRef.current = jump;

  useLayoutEffect(() => {
    if (request === null) return;
    scrollTo(request.target);
  }, [request, scrollTo]);

  const onVisibleRange = useCallback(
    (event: EventPayload): void => {
      const start = rangeStart(event);
      if (start === null) return;
      switch (tracker.report(start)) {
        case "idle":
        case "arrived":
        case "give-up":
          tracker.settle();
          return;
        case "nudge": {
          const wanted = tracker.nudge();
          if (wanted !== null) scrollTo(wanted);
          return;
        }
      }
    },
    [scrollTo, tracker],
  );

  useEffect(
    () =>
      addInputListener((event) => {
        const move = jumpMoveOf(event, bindings);
        if (move !== null) jumpRef.current(move);
      }),
    [bindings.prev, bindings.next, bindings.start, bindings.end],
  );

  return { jump, onVisibleRange };
}
