/**
 * What a program's colour roles are in the current theme.
 *
 * A program names a role — `accent`, `destructive`, `muted` — and this file is
 * the only place that reads the theme role behind it, the same rule the log
 * follows in `core/lib/ui/theme.ts`: no component hand-mixes a hex.
 */

import { useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { ToneToken } from "./tokens";

export function toneColor(t: AdwaitaTheme, tone: ToneToken = "default"): string {
  switch (tone) {
    case "muted":
      return t.color.text.dim;
    case "accent":
      return t.color.accent.base;
    case "success":
      return t.color.functional.success;
    case "warning":
      return t.color.functional.warning;
    case "destructive":
      return t.color.functional.destructive;
    default:
      return t.color.text.primary;
  }
}
