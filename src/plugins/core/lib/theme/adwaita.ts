import { useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { MuTheme } from "../../../../theme";
import { leadingOf } from "../ui/tokens";

export function buildMuThemeFromAdwaita(a: AdwaitaTheme): MuTheme {
  const { color, type, radius } = a;
  return {
    appearance: a.scheme,
    bg: color.surface.window,

    panel: color.surface.headerbar,
    border: color.divider.default,
    fg: color.text.primary,
    muted: color.text.dim,
    accent: color.accent.base,
    caret: color.accent.base,
    danger: color.functional.destructive,
    success: color.functional.success,
    warning: color.functional.warning,
    fontSans: type.fontFamily,
    fontMono: type.fontFamilyMono,
    radius: radius.md,
    fontSize: type.body,
    lineHeight: leadingOf("body"),
  };
}

export function useAdwaitaMuTheme(): MuTheme {
  return buildMuThemeFromAdwaita(useAdwaita());
}
