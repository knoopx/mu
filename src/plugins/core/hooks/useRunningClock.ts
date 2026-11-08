import { useEffect, useState } from "react";

/** How often a live run's elapsed time and speed are re-read. */
const TICK_MS = 1000;

/**
 * The moment to read a session's figures at.
 *
 * A run has to move the status bar on its own clock: a turn spends most of its
 * time in its tools, where nothing streams and no redraw would otherwise reach
 * the figures to say how long the turn has taken. While a run is in flight the
 * clock ticks; once it settles the log's own timestamps answer, and nothing
 * needs waking.
 */
export function useRunningClock(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, [running]);
  return now;
}
