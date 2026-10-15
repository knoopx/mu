import { useEffect, useMemo } from "react";
import type { AccentKey, ColorScheme } from "adwaita-gpuix";
import {
  accentLabel,
  accentNameList,
  DEFAULT_ACCENT_LABEL,
  themeLabel,
  themeNameList,
  themeStore,
  useEffectiveTheme,
  useThemeState,
  type ThemeSelection,
} from "../lib/theme/themeStore";
import {
  accentFromName,
  accentOfThemeRow,
  accentRows,
  parseInvocation,
  schemeFromName,
  schemeOfThemeRow,
  themeRows,
} from "../lib/theme/themeRows";
import { panelIndex, panelQuery } from "../lib/composer/mode";
import type { ComposerMode } from "../lib/composer/mode";
import type { ComposerPanelRow } from "../components/composer/Composer";

export type ThemeCommand =
  | { kind: "scheme"; scheme: ColorScheme }
  | { kind: "accent"; accent: AccentKey | null }
  | { kind: "open"; rows: ComposerPanelRow[]; message?: string };

export interface ThemePanelState {
  open: boolean;
  rows: ComposerPanelRow[];
  total: number;

  preview: ThemeSelection | null;

  applyScheme(scheme: ColorScheme): string;

  applyAccent(accent: AccentKey | null): string;

  command(text: string): ThemeCommand | null;

  names: { theme: string; accent: string };
}

export function useThemePanel(mode: ComposerMode): ThemePanelState {
  const themeState = useThemeState();
  const liveTheme = useEffectiveTheme();
  const target = mode.kind === "pick" ? mode.target : null;
  const query = panelQuery(mode);
  const open = target === "theme" || target === "accent";

  const rows = useMemo<ComposerPanelRow[]>(
    () =>
      target === "theme"
        ? themeRows(query)
        : target === "accent"
          ? accentRows(query, liveTheme.scheme)
          : [],
    [target, query, liveTheme.scheme],
  );

  const preview = useMemo<ThemeSelection | null>(() => {
    if (!open) return null;
    const row = rows[panelIndex(mode, rows.length)];
    if (row === undefined) return null;
    if (target === "theme") {
      const scheme = schemeOfThemeRow(row);
      return scheme === null
        ? null
        : { scheme, accent: themeState.applied.accent };
    }
    const accent = accentOfThemeRow(row);
    return accent === undefined
      ? null
      : { scheme: themeState.applied.scheme, accent };
  }, [open, rows, mode, target, themeState.applied]);

  useEffect(() => {
    if (preview === null) {
      themeStore.clearPreview();
      return;
    }
    themeStore.preview(preview);
  }, [preview]);

  useEffect(() => () => themeStore.clearPreview(), []);

  const names = { theme: themeNameList(), accent: accentNameList() };

  return {
    open,
    rows,
    total:
      target === "theme"
        ? themeRows("").length
        : accentRows("", liveTheme.scheme).length,
    preview,
    names,
    applyScheme: (scheme) => {
      const changed = themeStore.apply({
        scheme,
        accent: themeStore.state().applied.accent,
      });
      return changed
        ? `Theme · ${themeLabel(scheme)}`
        : `Already on ${themeLabel(scheme)}`;
    },
    applyAccent: (accent) => {
      const changed = themeStore.apply({
        scheme: themeStore.state().applied.scheme,
        accent,
      });
      return changed
        ? `Accent · ${accent === null ? DEFAULT_ACCENT_LABEL : accentLabel(accent)}`
        : "Already on that accent";
    },
    command: (text): ThemeCommand | null => {
      const themeArg = parseInvocation("theme", text);
      if (themeArg !== null) {
        if (themeArg.length === 0) return { kind: "open", rows: themeRows("") };
        const scheme = schemeFromName(themeArg);
        return scheme === null
          ? {
              kind: "open",
              rows: themeRows(""),
              message: `Unknown theme “${themeArg}” — ${names.theme}`,
            }
          : { kind: "scheme", scheme };
      }
      const accentArg = parseInvocation("accent", text);
      if (accentArg === null) return null;
      const accents = accentRows("", liveTheme.scheme);
      if (accentArg.length === 0) return { kind: "open", rows: accents };
      const accent = accentFromName(accentArg);
      return accent === undefined
        ? {
            kind: "open",
            rows: accents,
            message: `Unknown accent “${accentArg}” — ${names.accent}`,
          }
        : { kind: "accent", accent };
    },
  };
}
