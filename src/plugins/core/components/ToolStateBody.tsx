/**
 * The body of a tool row that has nothing to show but a state — a call that
 * stopped, and a call still reading.
 *
 * Both are one line of ink in the log's two columns, and both were being written
 * out per plugin, which is how a plugin's failure line ended up a different colour
 * and a different indent from the next one's. The wrapper is core's: a plugin that
 * owns its body says what the line reads, and what a running line and a failed line
 * look like stays in one place. A plugin with more to draw while it reads passes it
 * as the children, under the spinner.
 */

import { T, useAdwaita } from "adwaita-gpuix";
import type { JSX } from "react";

import { mutedText } from "../lib/ui/theme";
import { toolColumn, toolLine, toolMark, toolText } from "../lib/ui/toolRows";
import { StateSpinner } from "./StateSpinner";
import { ToolStateLine } from "./ToolStateLine";

export interface ToolFailedBodyProps {
  /** why the call stopped, in the tool's own words */
  text: string;
}

/** A call that stopped: the mark and the reason, and nothing else under the head. */
export function ToolFailedBody({ text }: ToolFailedBodyProps): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={toolColumn(t)}>
      <ToolStateLine
        icon="cancel"
        color={t.color.functional.destructive}
        text={text}
      />
    </div>
  );
}

export interface ToolRunningBodyProps {
  /** what is being read, in the tool's own words */
  text: string;

  /** what the tool draws while it reads — its own skeleton, under the spinner */
  children?: JSX.Element;
}

/** A call in flight: a spinner with what it is reading, then whatever it shows. */
export function ToolRunningBody({
  text,
  children,
}: ToolRunningBodyProps): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={toolColumn(t)}>
      <div style={toolLine(t)}>
        <StateSpinner style={toolMark} />
        <T size="caption" color={mutedText(t)} style={toolText(t)}>
          {text}
        </T>
      </div>
      {children}
    </div>
  );
}
