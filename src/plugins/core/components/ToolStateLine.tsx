/**
 * A state a tool call has to say in words — an error, a note, a scope that
 * came back empty. The icon and the caption wear the same colour, and the tool
 * that owns the state picks it, so no view here decides what a failure looks
 * like.
 */

import { Icon, T, useAdwaita, type IconName } from "adwaita-gpuix";
import type { JSX } from "react";

import { toolGrow, toolLine } from "../lib/ui/toolRows";

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
        size={t.control.navIconSize}
        color={color}
        style={{ flexShrink: 0 }}
      />
      <T size="caption" color={color} style={toolGrow}>
        {text}
      </T>
    </div>
  );
}
