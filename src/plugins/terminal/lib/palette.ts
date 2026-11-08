/**
 * What a cell's colour number means in this app's theme.
 *
 * The screen model keeps colour the way a terminal states it: an index into the
 * program's own 16, an index into the 256-colour xterm ramp, or a packed 24-bit
 * number for a program that was told truecolour was available. Only the app knows
 * what those look like, so the answer is given here, off the theme the window is
 * actually wearing — the same answer an index 0-15 gets anywhere else in mu, and
 * the reason a light terminal does not come out in dark-mode colours.
 *
 * `undefined` is a real answer: it is the *default* ink or fill, and a run that
 * was never given a colour has to stay the screen's own so a theme change repaints
 * it.
 */
import type { AdwaitaTheme } from "adwaita-gpuix";
import { BASE_HUES } from "adwaita-gpuix/tokens";

/** The core's sentinel for "whatever the host's default is". */
const DEFAULT_COLOR = 256;

export interface TerminalPalette {
  /** The screen's ink and fill — an uncoloured cell wears these. */
  ink: string;
  fill: string;
  /** The block the cursor stands in. */
  cursor: string;
  /** The program's own 16 colours, in the order the ANSI codes number them. */
  base: readonly string[];
}

const HUES = [
  BASE_HUES.red,
  BASE_HUES.green,
  BASE_HUES.yellow,
  BASE_HUES.blue,
  BASE_HUES.teal,
  BASE_HUES.pink,
  BASE_HUES.purple,
] as const;

/**
 * The ANSI 16 as mu's scheme numbers them.
 *
 * This is adwaita's own `ansiPalette`, rebuilt here because that one is not on
 * the package's public surface — and a terminal that mapped red to the app's
 * orange would misreport every build log it shows.
 */
function base16(t: AdwaitaTheme): readonly string[] {
  const eight = [
    t.color.text.dim,
    ...HUES.slice(0, 6).map((hue) => t.color.scale[hue]),
    t.color.text.primary,
  ];
  return [...eight, ...eight];
}

export function terminalPalette(t: AdwaitaTheme): TerminalPalette {
  return {
    ink: t.color.text.primary,
    fill: t.color.surface.card,
    cursor: t.color.accent.base,
    base: base16(t),
  };
}

const hex = (value: number): string =>
  `#${(value & 0xffffff).toString(16).padStart(6, "0")}`;

/** The xterm 6×6×6 cube and its grey ramp, the part of the 256 that is fixed
 *  and so can be drawn without asking the theme anything. */
function ramp(index: number): string {
  if (index < 232) {
    const step = index - 16;
    // The cube is six steps per channel, and its bottom step is not 0 but the
    // grey the ramp needs to meet the greys with.
    const channel = (n: number) => (n === 0 ? 0 : 55 + n * 40);
    const r = channel(Math.floor(step / 36));
    const g = channel(Math.floor(step / 6) % 6);
    const b = channel(step % 6);
    return hex((r << 16) | (g << 8) | b);
  }
  const level = 8 + (index - 232) * 10;
  return hex((level << 16) | (level << 8) | level);
}

/**
 * One cell's colour, resolved.
 *
 * `index` is what the core reports; `rgb` is set instead when the program asked
 * in 24-bit. An index under 16 belongs to the program's palette and is answered
 * by the theme, 16-255 is the xterm ramp, and anything else is the default —
 * which is no colour at all.
 */
export function cellColor(
  index: number,
  rgb: number | undefined,
  palette: TerminalPalette,
): string | undefined {
  if (rgb !== undefined) return hex(rgb);
  if (index === DEFAULT_COLOR || index < 0) return undefined;
  if (index < 16) return palette.base[index];
  return ramp(index);
}
