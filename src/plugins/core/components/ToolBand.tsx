/**
 * The band a tool's answer stands on.
 *
 * One plate, drawn once, for every answer the log shows: the lines a read quoted,
 * the lines a write left, a patch, chips and ranked rows, a plot, a tree, a
 * diagram, printed text. Before it there were two looks in the same column — the
 * file tools set their text on a plate and everything else drew loose lines
 * straight on the log page — and a column that changes its own shape per row is
 * a column nobody can skim.
 *
 * The plate is the recipe in `toolBand(t)` and nothing else may spell it. What
 * sits *inside* a band does not draw a plate of its own: an output box on the band
 * is flattened to the band's colour, and a diagram takes the band as its page so
 * its masking shapes do not punch holes in it.
 */

import { useAdwaita } from "adwaita-gpuix";
import type { JSX, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";

import { toolBand } from "../lib/ui/transcriptLayout";

export interface ToolBandProps {
  children: ReactNode;

  /** A band that must not shrink in a tight column takes `flexShrink: 0`. */
  style?: Partial<StyleDesc>;
}

export function ToolBand({ children, style }: ToolBandProps): JSX.Element {
  const t = useAdwaita();
  return <div style={{ ...toolBand(t), ...style }}>{children}</div>;
}
