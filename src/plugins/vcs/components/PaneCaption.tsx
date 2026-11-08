import type { JSX } from "react";
import { T, useAdwaita } from "adwaita-gpuix";
import { mutedText } from "../../core/lib/ui/theme";

/** One quiet line of a pane's own words — the only ink a pane writes itself. */
export function PaneCaption({ text }: { text: string }): JSX.Element {
  const t = useAdwaita();
  return (
    <T size="caption" color={mutedText(t)}>
      {text}
    </T>
  );
}
