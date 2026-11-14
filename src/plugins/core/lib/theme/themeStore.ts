import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SCHEMES, type AccentKey, type ColorScheme } from "adwaita-gpuix";
import { useSyncExternalStore } from "react";
import { muConfigDir, muDir } from "../utils/paths";

const DEFAULT_SCHEME: ColorScheme = "nightsky";
const DEFAULT_ACCENT: AccentKey | null = null;

export const THEME_LABELS: Record<ColorScheme, string> = {
  light: "Light",
  dark: "Dark",
  nightsky: "Nightsky",
};

export const THEME_NAMES: ColorScheme[] = [...SCHEMES];

export function isThemeName(value: unknown): value is ColorScheme {
  return typeof value === "string" && (THEME_NAMES as string[]).includes(value);
}

export function themeLabel(scheme: ColorScheme): string {
  return THEME_LABELS[scheme];
}

export function themeNameList(): string {
  return THEME_NAMES.join(" | ");
}

export interface ThemeSelection {
  scheme: ColorScheme;

  accent: AccentKey | null;
}

export interface ThemeState {
  applied: ThemeSelection;

  preview: ThemeSelection | null;
}

const ACCENT_KEYS: AccentKey[] = [
  "blue",
  "teal",
  "green",
  "yellow",
  "orange",
  "red",
  "pink",
  "purple",
  "slate",
];

export const ACCENT_NAMES: AccentKey[] = ACCENT_KEYS;

export const ACCENT_LABELS: Record<AccentKey, string> = {
  blue: "Blue",
  teal: "Teal",
  green: "Green",
  yellow: "Yellow",
  orange: "Orange",
  red: "Red",
  pink: "Pink",
  purple: "Purple",
  slate: "Slate",
};

export const DEFAULT_ACCENT_LABEL = "Scheme default";

export function isAccentName(value: unknown): value is AccentKey {
  return typeof value === "string" && ACCENT_KEYS.includes(value as AccentKey);
}

export function accentLabel(accent: AccentKey): string {
  return ACCENT_LABELS[accent];
}

export function accentNameList(): string {
  return ["default", ...ACCENT_KEYS].join(" | ");
}

const CONFIG_FILE_NAME = "theme.json";

function configFile(): string {
  return join(muConfigDir(), CONFIG_FILE_NAME);
}

function readSaved(): ThemeSelection {
  try {
    const raw = JSON.parse(readFileSync(configFile(), "utf8")) as {
      scheme?: unknown;
      accent?: unknown;
    };
    return {
      scheme: isThemeName(raw.scheme) ? raw.scheme : DEFAULT_SCHEME,
      accent: isAccentName(raw.accent) ? raw.accent : DEFAULT_ACCENT,
    };
  } catch {
    return { scheme: DEFAULT_SCHEME, accent: DEFAULT_ACCENT };
  }
}

function saveSelection(selection: ThemeSelection): void {
  try {
    muDir(muConfigDir());
    writeFileSync(
      configFile(),
      `${JSON.stringify({ scheme: selection.scheme, accent: selection.accent }, null, 2)}\n`,
      "utf8",
    );
  } catch {}
}

type Listener = () => void;

const listeners = new Set<Listener>();

let state: ThemeState = { applied: readSaved(), preview: null };

function emit(): void {
  for (const listener of [...listeners]) listener();
}

function same(a: ThemeSelection, b: ThemeSelection): boolean {
  return a.scheme === b.scheme && a.accent === b.accent;
}

function setPreview(selection: ThemeSelection): void {
  const next = same(selection, state.applied) ? null : selection;
  if (state.preview === null && next === null) return;
  if (state.preview !== null && next !== null && same(state.preview, next))
    return;
  state = { ...state, preview: next };
  emit();
}

function clearPreview(): void {
  if (state.preview === null) return;
  state = { ...state, preview: null };
  emit();
}

function setApplied(
  selection: ThemeSelection,
  persist: boolean = true,
): boolean {
  const changed = !same(state.applied, selection);
  if (state.preview !== null || changed) {
    state = { applied: selection, preview: null };
    emit();
  }
  if (changed && persist) saveSelection(selection);
  return changed;
}

function apply(selection: ThemeSelection): boolean {
  return setApplied(selection, true);
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getState(): ThemeState {
  return state;
}

function getEffective(): ThemeSelection {
  return state.preview ?? state.applied;
}

export const themeStore = {
  state: getState,
  effective: getEffective,
  isPreviewing: (): boolean => state.preview !== null,
  preview: setPreview,
  clearPreview,
  apply,
  setApplied,
  subscribe,
};

export function useThemeState(): ThemeState {
  return useSyncExternalStore(subscribe, getState, getState);
}

export function useEffectiveTheme(): ThemeSelection {
  return useSyncExternalStore(subscribe, getEffective, getEffective);
}
