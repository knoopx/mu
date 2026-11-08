/**
 * One caption across the width of a tool row: what a call read, what it
 * counted, the note it left. The colour is the caller's — a head is muted and
 * a tally is not — and `weight` is only ever set by a line that summarises.
 */

import { T, useAdwaita } from "adwaita-gpuix";
import type { JSX } from "react";

import { toolLine, toolText } from "../lib/ui/toolRows";

export interface ToolCaptionLineProps {
  text: string;
  color: string;
  weight?: string | number;
}

export function ToolCaptionLine({
  text,
  color,
  weight,
}: ToolCaptionLineProps): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={toolLine(t)}>
      <T size="caption" weight={weight} color={color} style={toolText(t)}>
        {text}
      </T>
    </div>
  );
}
