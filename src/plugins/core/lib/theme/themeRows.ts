import {
  ACCENTS,
  buildTheme,
  NIGHTSKY,
  type AccentKey,
  type ColorScheme,
} from "adwaita-gpuix";
import type {
  ComposerPanelRow,
  ComposerSwatchSpec,
} from "../../components/composer/Composer";
import { matchesQuery } from "../composer/options";
import {
  ACCENT_LABELS,
  ACCENT_NAMES,
  DEFAULT_ACCENT_LABEL,
  THEME_LABELS,
  THEME_NAMES,
  isAccentName,
  isThemeName,
} from "./themeStore";

const DEFAULT_ACCENT_KEY = "default";

function baseOf(scheme: ColorScheme): {
  window: string;
  surface: string;
  text: string;
} {
  const c = buildTheme(scheme).color;
  return {
    window: c.surface.window,
    surface: c.surface.headerbar,
    text: c.text.primary,
  };
}

const BASES = new Map<
  ColorScheme,
  { window: string; surface: string; text: string }
>(THEME_NAMES.map((scheme) => [scheme, baseOf(scheme)]));

function base(scheme: ColorScheme): {
  window: string;
  surface: string;
  text: string;
} {
  const cached = BASES.get(scheme);
  if (cached !== undefined) return cached;
  const built = baseOf(scheme);
  BASES.set(scheme, built);
  return built;
}

function themeSwatch(scheme: ColorScheme): ComposerSwatchSpec {
  return base(scheme);
}

function schemeAccent(scheme: ColorScheme): string {
  return scheme === "nightsky" ? NIGHTSKY.defaultAccent : ACCENTS.blue;
}

function accentSwatch(
  scheme: ColorScheme,
  accent: AccentKey | null,
): ComposerSwatchSpec {
  const ink =
    accent === null
      ? schemeAccent(scheme)
      : scheme === "nightsky"
        ? NIGHTSKY.accents[accent]
        : ACCENTS[accent];
  return { window: base(scheme).window, surface: ink, text: ink };
}

export function themeRows(query: string): ComposerPanelRow[] {
  return THEME_NAMES.filter((scheme) =>
    matchesQuery(query, scheme, THEME_LABELS[scheme]),
  ).map((scheme) => ({
    kind: "theme" as const,
    key: scheme,
    label: THEME_LABELS[scheme],
    swatch: themeSwatch(scheme),
  }));
}

export function accentRows(
  query: string,
  scheme: ColorScheme,
): ComposerPanelRow[] {
  const rows: Array<{ key: string; label: string; accent: AccentKey | null }> =
    [
      { key: DEFAULT_ACCENT_KEY, label: DEFAULT_ACCENT_LABEL, accent: null },
      ...ACCENT_NAMES.map((accent) => ({
        key: accent,
        label: ACCENT_LABELS[accent],
        accent,
      })),
    ];
  return rows
    .filter((row) => matchesQuery(query, row.key, row.label))
    .map((row) => ({
      kind: "theme" as const,
      key: row.key,
      label: row.label,
      swatch: accentSwatch(scheme, row.accent),
    }));
}

export function schemeOfThemeRow(
  row: ComposerPanelRow | undefined,
): ColorScheme | null {
  if (row === undefined || row.kind !== "theme") return null;
  return isThemeName(row.key) ? row.key : null;
}

export function accentOfThemeRow(
  row: ComposerPanelRow | undefined,
): AccentKey | null | undefined {
  if (row === undefined || row.kind !== "theme") return undefined;
  if (row.key === DEFAULT_ACCENT_KEY) return null;
  return isAccentName(row.key) ? row.key : undefined;
}

export function schemeFromName(name: string): ColorScheme | null {
  const needle = name.trim().toLowerCase();
  if (needle.length === 0) return null;
  const exact = THEME_NAMES.find(
    (scheme) =>
      scheme === needle || THEME_LABELS[scheme].toLowerCase() === needle,
  );
  if (exact !== undefined) return exact;
  const prefixes = THEME_NAMES.filter((scheme) => scheme.startsWith(needle));
  return prefixes.length === 1 ? prefixes[0] : null;
}

export function accentFromName(name: string): AccentKey | null | undefined {
  const needle = name.trim().toLowerCase();
  if (needle.length === 0) return undefined;
  if (needle === "default" || needle === "auto") return null;
  const exact = ACCENT_NAMES.find(
    (accent) =>
      accent === needle || ACCENT_LABELS[accent].toLowerCase() === needle,
  );
  if (exact !== undefined) return exact;
  const prefixes = ACCENT_NAMES.filter((accent) => accent.startsWith(needle));
  return prefixes.length === 1 ? prefixes[0] : undefined;
}

const COMMAND_INVOCATION = (name: string) =>
  new RegExp(`^\\/${name}\\b[ \\t]*([\\s\\S]*)$`, "i");

export function parseInvocation(command: string, text: string): string | null {
  const match = COMMAND_INVOCATION(command).exec(text.trim());
  return match === null ? null : (match[1] ?? "").trim();
}
