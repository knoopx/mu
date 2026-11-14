/**
 * The diagram's colours, and the text it draws.
 *
 * Pele writes its palette as `var(--pele-*)` and leaves every `<text>` element
 * unstyled, expecting a stylesheet it never ships. Neither half survives a
 * picture being drawn inside the log: the variables have nothing to resolve
 * against, and a text node with no font, size or fill is invisible at best. So
 * the markup is resolved here, against the theme the app is wearing, and each
 * text element is told what to be — the same two steps the editor app that
 * started this plugin performs before it rasterises.
 */

import type { AdwaitaTheme } from "adwaita-gpuix";

import { paneFill } from "../../core/lib/ui/theme";
import { DIAGRAM_FONT_SIZE, DIAGRAM_TITLE_RATIO } from "../constants";

/** The variables Pele reads, in the order it lists them. */
const PELE_VARS = [
  "--pele-bg",
  "--pele-fg",
  "--pele-muted",
  "--pele-line",
  "--pele-surface",
  "--pele-surface-alt",
  "--pele-border",
  "--pele-accent",
  "--pele-series-1",
  "--pele-series-2",
  "--pele-series-3",
  "--pele-series-4",
  "--pele-series-5",
  "--pele-series-6",
  "--pele-series-7",
  "--pele-series-8",
] as const;

/**
 * What each of Pele's roles means in this app.
 *
 * **A diagram paints no page of its own** — Pele draws no canvas-filling rect,
 * and the picture carries no backdrop, so its ink stands directly on the log.
 * That makes the log's own page the only surface there is, and it is the colour
 * every masking shape has to be: `--pele-bg` is the plate under an edge label,
 * `--pele-surface` is a node's interior and a gantt's section band, and both
 * exist to cover what passes behind them. Either of them a different colour
 * from the page turns the picture into a darker card with holes in it, which is
 * why this reads the page from core rather than picking a surface. A group
 * still gets a band, one step up from the page. Series colours come from the
 * chart ramp, which is why a pie and a bar chart in the same app agree.
 */
function diagramVars(t: AdwaitaTheme): Record<string, string> {
  const series = t.color.chart.series;
  const page = paneFill(t);
  const vars: Record<string, string> = {
    "--pele-bg": page,
    "--pele-fg": t.color.text.primary,
    "--pele-muted": t.color.text.secondary,
    "--pele-line": t.color.text.secondary,
    "--pele-surface": page,
    "--pele-surface-alt": t.color.surface.hover,
    "--pele-border": t.color.border.default,
    "--pele-accent": t.color.accent.base,
  };
  PELE_VARS.forEach((name, index) => {
    if (!name.startsWith("--pele-series-")) return;
    const step = Number(name.slice("--pele-series-".length)) - 1;
    vars[name] = series[step % series.length] ?? t.color.accent.base;
  });
  return vars;
}

/** Pele's internal aliases: `--_fg: var(--pele-fg, #111)`, then `var(--_fg)`. */
function aliasDefs(svg: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const match of svg.matchAll(/--(_[A-Za-z0-9]+)\s*:\s*([^;"}]+)/g)) {
    found.set(`--${match[1]}`, match[2].trim());
  }
  return found;
}

/** Every `var(…)` the markup still holds, answered from the app's own colours. */
function resolveVars(svg: string, vars: Record<string, string>): string {
  const withPele = svg.replace(
    /var\(\s*(--pele-[A-Za-z0-9-]+)\s*(?:,\s*([^)]+?))?\s*\)/g,
    (_all, name: string, fallback: string | undefined) =>
      vars[name] ?? (fallback ?? "").trim(),
  );

  const aliases = aliasDefs(withPele);
  let out = withPele;
  let previous = "";
  while (out !== previous) {
    previous = out;
    out = out.replace(
      /var\(\s*(--_[A-Za-z0-9]+)\s*(?:,\s*([^)]+?))?\s*\)/g,
      (all, name: string, fallback: string | undefined) =>
        aliases.get(name) ??
        vars[`--${name.slice(2)}`] ??
        fallback?.trim() ??
        all,
    );
  }
  return out;
}

const TEXT_OPEN = /<text\b([^>]*)>/g;

/** A `<text>` element told what it is, because nothing else will tell it. */
function drawText(svg: string, t: AdwaitaTheme, foreground: string): string {
  const family = t.type.fontFamily;
  const titleSize = Math.round(DIAGRAM_FONT_SIZE * DIAGRAM_TITLE_RATIO);

  return svg.replace(TEXT_OPEN, (all: string, attrs: string) => {
    const isTitle = /class="[^"]*\bpele-title\b/.test(attrs);
    const size = isTitle ? titleSize : DIAGRAM_FONT_SIZE;
    const add: string[] = [];
    if (!/\bfont-family=/.test(attrs)) add.push(`font-family="${family}"`);
    if (!/\bfont-size=/.test(attrs)) add.push(`font-size="${String(size)}"`);
    if (!/\bfill=/.test(attrs)) add.push(`fill="${foreground}"`);
    if (add.length === 0) return all;
    return `<text ${add.join(" ")}${attrs}>`;
  });
}

/**
 * The markup as the app will draw it: Pele's roles resolved to this theme's
 * colours, and every label carrying the font, size and ink it needs.
 */
export function paintDiagram(svg: string, t: AdwaitaTheme): string {
  if (svg === "") return "";
  const vars = diagramVars(t);
  const painted = resolveVars(svg, vars);
  return drawText(painted, t, vars["--pele-fg"]);
}
