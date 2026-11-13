import { useEffect, useState, type JSX } from "react";
import { toneColor, useAdwaita } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { STATE_GLYPH } from "../lib/ui/tokens";

/**
 * The mark a running thing wears: the log's running tool, a search still
 * fetching, a session still answering, a program's line of work still open.
 *
 * It is pi's own spinner, frame for frame. pi's `Loader` turns through ten
 * braille cells — its `DEFAULT_FRAMES` — and takes a frame every 80ms, its
 * `DEFAULT_INTERVAL_MS`, so a session running in mu says exactly what it says
 * in the terminal: one dot walking round a cell, painted in the accent tone
 * because pi colours its working spinner with the accent too. The cells are set
 * in the mono family, which is where a braille cell has its glyph.
 */
const PI_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"] as const;

const FRAME_MS = 80;

export interface StateSpinnerProps {
  style?: Partial<StyleDesc>;
}

export function StateSpinner({ style }: StateSpinnerProps): JSX.Element {
  const t = useAdwaita();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const turn = setInterval(
      () => setFrame((f) => (f + 1) % PI_FRAMES.length),
      FRAME_MS,
    );
    return () => clearInterval(turn);
  }, []);

  /**
   * The box is the mark's, not the glyph's: a braille cell is narrower than the
   * `STATE_GLYPH` column every mark in the log hangs in, so the box keeps that
   * column and the cell stands centred in it. A row whose frame changed would
   * otherwise shift by a cell's width every 80ms.
   */
  const box: StyleDesc = {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: STATE_GLYPH,
    height: STATE_GLYPH,
    flexShrink: 0,
    pointerEvents: "none",
    ...style,
  };

  const cell: StyleDesc = {
    fontSize: STATE_GLYPH,
    lineHeight: 1,
    fontFamily: t.type.fontFamilyMono,
    color: toneColor(t, "accent"),
    whiteSpace: "nowrap",
    userSelect: "none",
    flexShrink: 0,
  };

  return (
    <div style={box}>
      <text style={cell}>{PI_FRAMES[frame % PI_FRAMES.length]}</text>
    </div>
  );
}
