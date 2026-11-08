/**
 * A state a tool call has to say in words — an error, a note, a scope that
 * came back empty. The icon and the caption wear the same colour, and the tool
 * that owns the state picks it, so no view here decides what a failure looks
 * like. The mark takes the header glyph's size and hangs into the page inset,
 * so a header, a running line and a note stand in one column down the log.
 */

import { Icon, T, useAdwaita, type IconName } from "adwaita-gpuix";
import type { JSX } from "react";

import { STATE_GLYPH } from "../lib/ui/tokens";
import { toolLine, toolMark, toolText } from "../lib/ui/toolRows";

export interface ToolStateLineProps {
  icon: IconName;
  text: string;
  color: string;
}

export function ToolStateLine({
  icon,
  text,
  color,
}: ToolStateLineProps): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={toolLine(t)}>
      <Icon
        name={icon}
        size={STATE_GLYPH}
        color={color}
        style={toolMark}
      />
      <T size="caption" color={color} style={toolText(t)}>
        {text}
      </T>
    </div>
  );
}
