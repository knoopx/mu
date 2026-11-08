import type { JSX } from "react";
import type { StyleDesc } from "@gpuix/react";
import { PaneCaption } from "./PaneCaption";

/** A pane with nothing to draw: its own words, standing in the pane's slot. */
export function PaneEmpty({
  text,
  style,
}: {
  text: string;
  style: StyleDesc;
}): JSX.Element {
  return (
    <div style={style}>
      <PaneCaption text={text} />
    </div>
  );
}
