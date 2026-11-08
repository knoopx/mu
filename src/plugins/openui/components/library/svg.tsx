import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod";
import { useAdwaita } from "adwaita-gpuix";
import { TONE_TOKENS, type ToneToken } from "../../lib/tokens";
import { toneColor } from "../../lib/theme";



type ColorOf = (value: string) => string;

type Node = { type?: string; typeName?: string; props?: Record<string, unknown> };

type Paint = {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
};

type ShapeProps = Record<string, unknown> & Paint;

const POINTS = /^[\d\s,.eE+-]*$/;
const PATH = /^[MmLlHhVvCcSsQqTtAaZz\d\s,.eE+-]*$/;
const TRANSFORM_ARGS: Record<string, number[]> = {
  translate: [1, 2],
  rotate: [1, 3],
  scale: [1, 2],
  skewX: [1],
  skewY: [1],
  matrix: [6],
};
const TEXT_ANCHORS = ["start", "middle", "end"];
const FONT_WEIGHTS: Record<string, number> = { normal: 440, medium: 560, semibold: 640 };

const num = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;


const n = (value: unknown): number => num(value) ?? 0;


const len = (value: unknown): number => Math.max(0, num(value) ?? 0);

function safeTransform(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 500) return undefined;
  const parts = [...value.matchAll(/\s*([a-zA-Z]+)\(([^()]*)\)\s*/g)];
  if (!parts.length || parts.map((p) => p[0]).join("") !== value) return undefined;
  const valid = parts.every(([, name, args]) => {
    const numbers = args.trim().split(/\s*,\s*|\s+/).filter(Boolean);
    return (
      (TRANSFORM_ARGS[name]?.includes(numbers.length) ?? false) &&
      numbers.every((x) => Number.isFinite(Number(x)))
    );
  });
  return valid ? value.trim() : undefined;
}

const safe = (value: unknown, pattern: RegExp): string | undefined =>
  typeof value === "string" && value.length < 20000 && pattern.test(value)
    ? value
    : undefined;

const esc = (value: unknown): string =>
  String(value ?? "").replace(/[&<>"]/g, (c) => `&${c === "&" ? "amp" : c === "<" ? "lt" : c === ">" ? "gt" : "quot"};`);


function paintAttrs(
  p: Paint,
  filled: boolean,
  colorOf: ColorOf,
): Record<string, string | number> {
  const attrs: Record<string, string | number> = {};
  attrs.fill =
    p.fill !== undefined
      ? colorOf(p.fill)
      : filled && p.stroke === undefined
        ? colorOf("default")
        : "none";
  if (p.stroke !== undefined) attrs.stroke = colorOf(p.stroke);
  else if (!filled) attrs.stroke = colorOf("default");
  attrs["stroke-width"] = p.strokeWidth ?? (filled ? 0 : 2);
  if (p.opacity !== undefined) attrs.opacity = Math.min(1, Math.max(0, p.opacity));
  attrs["stroke-linecap"] = "round";
  attrs["stroke-linejoin"] = "round";
  return attrs;
}

const attrs = (values: Record<string, string | number>): string =>
  Object.entries(values)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join("");


const attr = (name: string, value: unknown): string =>
  value === undefined ? "" : ` ${name}="${esc(value)}"`;

const circle = (p: ShapeProps, colorOf: ColorOf): string =>
  `<circle cx="${n(p.cx)}" cy="${n(p.cy)}" r="${len(p.r)}"${attrs(paintAttrs(p, true, colorOf))}/>`;

const ellipse = (p: ShapeProps, colorOf: ColorOf): string =>
  `<ellipse cx="${n(p.cx)}" cy="${n(p.cy)}" rx="${len(p.rx)}" ry="${len(p.ry)}"${attrs(paintAttrs(p, true, colorOf))}/>`;

const rect = (p: ShapeProps, colorOf: ColorOf): string =>
  `<rect x="${n(p.x)}" y="${n(p.y)}" width="${len(p.width)}" height="${len(p.height)}"${attr("rx", p.rx === undefined ? undefined : n(p.rx))}${attrs(paintAttrs(p, true, colorOf))}/>`;

const line = (p: ShapeProps, colorOf: ColorOf): string =>
  `<line x1="${n(p.x1)}" y1="${n(p.y1)}" x2="${n(p.x2)}" y2="${n(p.y2)}"${attrs(paintAttrs(p, false, colorOf))}/>`;

const path = (p: ShapeProps, colorOf: ColorOf): string => {
  const d = safe(p.d, PATH);
  return d ? `<path d="${esc(d)}"${attrs(paintAttrs(p, p.fill !== undefined, colorOf))}/>` : "";
};

const polyline = (p: ShapeProps, colorOf: ColorOf): string => {
  const pts = safe(p.points, POINTS);
  return pts ? `<polyline points="${esc(pts)}"${attrs(paintAttrs(p, false, colorOf))}/>` : "";
};

const polygon = (p: ShapeProps, colorOf: ColorOf): string => {
  const pts = safe(p.points, POINTS);
  return pts ? `<polygon points="${esc(pts)}"${attrs(paintAttrs(p, true, colorOf))}/>` : "";
};

const textAnchorOf = (p: ShapeProps): string =>
  TEXT_ANCHORS.includes(String(p.anchor)) ? String(p.anchor) : "start";

const fontWeightOf = (p: ShapeProps): number => FONT_WEIGHTS[String(p.weight)] ?? 440;

const svgText = (p: ShapeProps, colorOf: ColorOf): string =>
  `<text x="${n(p.x)}" y="${n(p.y)}" font-size="${num(p.size) ?? 12}" font-weight="${fontWeightOf(p)}" text-anchor="${textAnchorOf(p)}" fill="${colorOf(typeof p.fill === "string" ? p.fill : "default")}">${esc(p.text ?? "")}</text>`;

const group = (p: ShapeProps, colorOf: ColorOf): string => {
  const kids = (Array.isArray(p.children) ? (p.children as Node[]) : [])
    .map((child) => shapeMarkup(child, colorOf))
    .join("");
  return `<g${attr("transform", safeTransform(p.transform))}${attr("opacity", num(p.opacity))}>${kids}</g>`;
};


const SHAPE_SERIALIZERS: Record<string, (p: ShapeProps, colorOf: ColorOf) => string> = {
  Circle: circle,
  Ellipse: ellipse,
  Rect: rect,
  Line: line,
  Path: path,
  Polyline: polyline,
  Polygon: polygon,
  SvgText: svgText,
  G: group,
};

function shapeMarkup(node: Node, colorOf: ColorOf): string {
  const serialize = node.typeName === undefined ? undefined : SHAPE_SERIALIZERS[node.typeName];
  if (serialize === undefined) return "";
  return serialize((node.props ?? {}) as ShapeProps, colorOf);
}

const paint = {
  fill: z.union([z.enum(TONE_TOKENS), z.string()]).optional().describe("Tone or hex."),
  stroke: z.union([z.enum(TONE_TOKENS), z.string()]).optional().describe("Tone or hex."),
  strokeWidth: z.number().optional().describe("Stroke width (default 2)."),
  opacity: z.number().min(0).max(1).optional().describe("0 to 1."),
};

const toneOrHex = (t: ReturnType<typeof useAdwaita>) => (value: string): string =>
  (TONE_TOKENS as readonly string[]).includes(value)
    ? toneColor(t, value as ToneToken)
    : /^#[0-9a-fA-F]{3,8}$/.test(value)
      ? value
      : toneColor(t, "default");

const VIEWBOX = /^\s*[-\d.]+(\s*[\s,]\s*[-\d.]+){3}\s*$/;


function svgSize(
  viewBox: string,
  width: number | undefined,
  height: number | undefined,
): { width: number; height: number } {
  const [, , vbwRaw, vbhRaw] = viewBox.trim().split(/[\s,]+/);
  const vbw = Number(vbwRaw) || 100;
  const vbh = Number(vbhRaw) || 100;
  const w = width ?? Math.max(280, Math.round(vbw * 1.5));
  return { width: w, height: height ?? Math.round(w * (vbh / vbw)) };
}

export const Svg = defineComponent({
  name: "Svg",
  props: z.object({
    children: z.array(z.any()).optional().describe("Shapes: Circle, Rect, Path, Line, Polyline, Polygon, SvgText, G."),
    viewBox: z.string().describe('Coordinate box, e.g. "0 0 100 100".'),
    width: z.number().optional().describe("Width in px (default: fill the column)."),
    height: z.number().optional().describe("Height in px (default: from the viewBox)."),
  }),
  description:
    "A vector drawing for diagrams, parts and charts of your own. Shapes take numbers, so state can move them.",
  component: ({ props }) => {
    const t = useAdwaita();
    const viewBox = safe(props.viewBox, VIEWBOX) ?? "0 0 100 100";
    const colorOf = toneOrHex(t);
    const kids = (Array.isArray(props.children) ? (props.children as Node[]) : [])
      .filter((child) => child && child.type === "element")
      .map((child) => shapeMarkup(child, colorOf))
      .join("");
    const { width, height } = svgSize(viewBox, props.width, props.height);
    
    const markup = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${esc(viewBox)}">${kids}</svg>`;
    return (
      <img
        src={`data:image/svg+xml;utf8,${encodeURIComponent(markup)}`}
        objectFit="contain"
        style={{ width, height, flexShrink: 0 }}
      />
    );
  },
});
const inert = () => null;

export const Circle = defineComponent({
  name: "Circle",
  props: z.object({ cx: z.number(), cy: z.number(), r: z.number(), ...paint }),
  description: "Filled disc inside Svg.",
  component: inert,
});

export const Ellipse = defineComponent({
  name: "Ellipse",
  props: z.object({ cx: z.number(), cy: z.number(), rx: z.number(), ry: z.number(), ...paint }),
  description: "Filled ellipse inside Svg.",
  component: inert,
});

export const Rect = defineComponent({
  name: "Rect",
  props: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rx: z.number().optional().describe("Corner radius."),
    ...paint,
  }),
  description: "Filled rectangle inside Svg.",
  component: inert,
});

export const Line = defineComponent({
  name: "Line",
  props: z.object({
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    stroke: z.union([z.enum(TONE_TOKENS), z.string()]).optional(),
    strokeWidth: z.number().optional(),
    opacity: z.number().optional(),
  }),
  description: "Straight stroke inside Svg.",
  component: inert,
});

export const Path = defineComponent({
  name: "Path",
  props: z.object({ d: z.string().describe('SVG path data, e.g. "M10 10 L90 90".'), ...paint }),
  description: "Any outline you can describe with path data, inside Svg.",
  component: inert,
});

export const Polyline = defineComponent({
  name: "Polyline",
  props: z.object({
    points: z.string().describe('Points as "0,0 10,5 20,0".'),
    stroke: z.union([z.enum(TONE_TOKENS), z.string()]).optional(),
    strokeWidth: z.number().optional(),
    fill: z.union([z.enum(TONE_TOKENS), z.string()]).optional(),
    opacity: z.number().optional(),
  }),
  description: "Open polyline, for sparklines and traces, inside Svg.",
  component: inert,
});

export const Polygon = defineComponent({
  name: "Polygon",
  props: z.object({ points: z.string().describe('Points as "0,0 10,5 20,0".'), ...paint }),
  description: "Closed filled shape, inside Svg.",
  component: inert,
});

export const G = defineComponent({
  name: "G",
  props: z.object({
    children: z.array(z.any()).describe("Shapes to move or fade together."),
    transform: z
      .string()
      .optional()
      .describe('Like "rotate(30 50 50)" or "translate(10 0)".'),
    opacity: z.number().min(0).max(1).optional(),
  }),
  description: "Group of shapes sharing a transform or opacity, inside Svg.",
  component: inert,
});

export const SvgText = defineComponent({
  name: "SvgText",
  props: z.object({
    text: z.string(),
    x: z.number(),
    y: z.number(),
    size: z.number().optional().describe("Font size (default 12)."),
    fill: z.union([z.enum(TONE_TOKENS), z.string()]).optional(),
    anchor: z.enum(["start", "middle", "end"]).optional().describe("Horizontal anchor."),
    weight: z.enum(["normal", "medium", "semibold"]).optional(),
  }),
  description: "Label drawn in the drawing itself, inside Svg.",
  component: inert,
});

export const svgComponents = [Svg, Circle, Ellipse, Rect, Line, Path, Polyline, Polygon, G, SvgText];
