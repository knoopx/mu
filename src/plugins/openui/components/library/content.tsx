/**
 * The content area of the language: what a program says, and the small things it
 * says it with — a mark, a picture, a named file, a card about a thing.
 *
 * The names here are the reference implementation's, and so is the split: a
 * `Callout` is the line the app states about the screen, a `Metric` is the one
 * figure a screen is read by, an `Entity` is a card about a product, a place or
 * a person. mu's older words for three of them (`Note`, `Stat`, the detail list
 * that used to be called `Details`) still draw, but they are the aliases in
 * `aliases.ts` and no prompt teaches them.
 *
 * A program never sets a font: `Title("…","lg")` is a `ProgramTextSize` and the
 * app's scale answers for it, and `tone: "warn"` is a word `lib/theme.ts` turns
 * into a theme colour — the reference's words (`good`, `warn`, `bad`, `neutral`,
 * `info`) and mu's own both mean the same colour there.
 */

import type { JSX } from "react";
import { defineComponent, type ElementNode } from "@openuidev/lang-core";
import {
  Badge as AdwaitaBadge,
  Icon as AdwaitaIcon,
  iconSvg,
  T,
} from "adwaita-gpuix";
import { z } from "zod/v4";

import { HAIRLINE, INLINE_GLYPH, figureGap } from "../../../core/lib/ui/tokens";
import { iconForFile } from "../../../core/lib/files/fileIcons";
import { mutedText } from "../../../core/lib/ui/theme";
import { ZoomImage } from "../../../core/components/ZoomImage";
import { innerGap, programTextRole, programTitleWeight, type ProgramTextSize } from "../../lib/tokens";
import {
  programBadgeVariant,
  programRule,
  programTextColor,
  programToneGlyph,
  toneOfValue,
  type ProgramTone,
} from "../../lib/theme";
import { programImage } from "../../lib/data/image";
import type { ProgramContext } from "./context";
import {
  ProgramSourceNote,
  ProgramText,
  listProp,
  programColumnStyle,
  programRowStyle,
  prop,
  sourceProp,
  textOf,
  textProp,
} from "./context";
import { cellOf, cellText, isFigure, textCell } from "./rows";

const SIZE_WORD = z.enum(["sm", "md", "lg", "xl"]);

/** What a detail row calls its two cells. */
const DETAIL_NAMES = ["label", "value", "tone"] as const;

/* ------------------------------------------------------------- the words */

export const Title = defineComponent({
  name: "Title",
  description:
    "a heading: sm inside a Card, lg or xl only for the screen itself",
  props: z.object({
    text: z.union([z.string(), z.number()]),
    size: SIZE_WORD.nullable().optional(),
  }),
  component: drawTitle,
});

export const Text = defineComponent({
  name: "Text",
  description:
    "a paragraph of the screen's own prose — the sentence the block means, not a table of its numbers",
  props: z.object({
    text: z.union([z.string(), z.number()]),
    tone: z.string().nullable().optional(),
    size: SIZE_WORD.nullable().optional(),
    emphasise: z.boolean().nullable().optional(),
  }),
  component: drawText,
});

export const Caption = defineComponent({
  name: "Caption",
  description: "a quiet line: a label, a count, a footnote",
  props: z.object({
    text: z.union([z.string(), z.number()]),
  }),
  component: drawCaption,
});

export const Badge = defineComponent({
  name: "Badge",
  description:
    "one fact, short: a state, a count, a category — explained in the cell beside it, not in the badge",
  props: z.object({
    text: z.union([z.string(), z.number()]),
    tone: z.string().nullable().optional(),
  }),
  component: drawBadge,
});

export const Callout = defineComponent({
  name: "Callout",
  description:
    "the line the screen states about itself, with the mark its tone carries",
  props: z.object({
    text: z.string(),
    tone: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
  }),
  component: drawCallout,
});

export const Code = defineComponent({
  name: "Code",
  description:
    "a block of monospace text the human may want to copy — a command, a snippet quoted by hand; code that lives in a file is a Snippet",
  props: z.object({
    code: z.string(),

    /** Named for the reader of the block; mu draws no syntax colours. */
    language: z.string().nullable().optional(),
  }),
  component: drawCode,
});

/* -------------------------------------------------------- the figures said */

export const Metric = defineComponent({
  name: "Metric",
  description:
    "the one figure a screen is read by: its label, its value, the line under it, and where the number came from",
  props: z.object({
    label: z.union([z.string(), z.number()]),
    value: z.union([z.string(), z.number()]),
    note: z.union([z.string(), z.number()]).nullable().optional(),
    tone: z.string().nullable().optional(),
    source: z.string().nullable().optional(),
    size: SIZE_WORD.nullable().optional(),
  }),
  component: drawMetric,
});

/**
 * A labelled fact, or a list of them.
 *
 * The reference writes one `KeyValue` for a whole spec sheet and hands it a map
 * or a list of pairs; mu used to have a component per line and a `Details` block
 * that drew the rules between them. Both shapes still arrive here, so the
 * drawer takes the pairs however they were written — `{label: value}`,
 * `[["k","v"]]`, `[{label, value, tone}]`, or the one pair a mu program wrote
 * positionally as `KeyValue("Builds", "412")`.
 */
export const KeyValue = defineComponent({
  name: "KeyValue",
  description:
    "labelled facts, one per row, with a rule between them: a map, a list of pairs, or a list of {label, value, tone?}",
  props: z.object({
    pairs: z.any(),
    tone: z.string().nullable().optional(),
  }),
  component: drawKeyValue,
});

/* ------------------------------------------------ marks, pictures, things */

/**
 * The lucide names the reference teaches, spelled the way mu's icon set spells
 * them.
 *
 * An unknown name draws nothing, which is the wrong kind of quiet: a screen
 * whose mark did not resolve would look intentional. So the taught names are
 * mapped once here, and a name that still resolves to nothing prints itself as
 * a caption instead.
 */
const ICON_SPELLING: Record<string, string> = {
  check: "check",
  x: "close",
  plus: "add",
  copy: "content-copy",
  trash: "delete",
  trash2: "delete",
  download: "download",
  externallink: "open-in-new",
  play: "play-arrow",
  search: "search",
  settings: "settings",
  filetext: "description",
  alerttriangle: "warning",
  warning: "warning",
  info: "info",
  lock: "lock",
  bug: "bug-report",
  gitbranch: "account-tree",
  branch: "account-tree",
  clock: "schedule",
  timer: "timer",
  calendar: "calendar-month",
  star: "star",
  bolt: "bolt",
  rocket: "rocket",
  book: "book",
  quiz: "quiz",
  lightbulb: "lightbulb",
};

const iconWordOf = (name: string): string =>
  name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");

/** One icon name, as the icon set actually spells it, or "" when it has no mark. */
export function resolveIcon(name: string): string {
  const wanted = name.trim();
  if (wanted === "") return "";
  if (wanted.includes(":")) return iconSvg(wanted) === "" ? "" : wanted;
  const alias = ICON_SPELLING[iconWordOf(wanted)];
  if (alias !== undefined && iconSvg(alias) !== "") return alias;
  return iconSvg(wanted) === "" ? "" : wanted;
}

export const Icon = defineComponent({
  name: "Icon",
  description:
    "one mark, by name: the reference's lucide names are understood, and a name with no mark prints itself rather than drawing nothing",
  props: z.object({
    name: z.string(),
    tone: z.string().nullable().optional(),
  }),
  component: drawIcon,
});

export const Image = defineComponent({
  name: "Image",
  description:
    "a picture from this folder, opened full-screen when it is clicked over — the only way the human sees an image",
  props: z.object({
    src: z.string(),
    alt: z.string().nullable().optional(),
  }),
  component: drawImage,
});

export const File = defineComponent({
  name: "File",
  description: "a file this project holds, named with the mark its kind wears",
  props: z.object({
    path: z.string(),
    line: z.number().nullable().optional(),
  }),
  component: drawFile,
});

export const Sources = defineComponent({
  name: "Sources",
  description:
    "the pages a reply read: its title and its address, one per row, so a claim can be checked",
  props: z.object({
    links: z.array(z.any()),
  }),
  component: drawSources,
});

export const List = defineComponent({
  name: "List",
  description:
    "rows of {title, detail?, icon?, value?, tone?}: a thing, the line under it, and the figure beside it",
  props: z.object({
    items: z.array(z.any()),
  }),
  component: drawList,
});

export const Entity = defineComponent({
  name: "Entity",
  description:
    "a card about one thing — a product, a place, a person: its name, its kind, its picture, and the facts about it",
  props: z.object({
    name: z.string(),
    kind: z
      .enum(["product", "place", "person", "org", "link", "other"])
      .nullable()
      .optional(),
    image: z.string().nullable().optional(),
    facts: z.any().nullable().optional(),
    url: z.string().nullable().optional(),
    note: z.string().nullable().optional(),
  }),
  component: drawEntity,
});

/* ------------------------------------------------------------------ draws */

export function drawTitle(node: ElementNode, ctx: ProgramContext): JSX.Element {
  return (
    <T
      size={programTextRole(prop<ProgramTextSize>(node.props, "size", "md"))}
      weight={programTitleWeight(ctx.t)}
      color={ctx.t.color.text.primary}
      clamp={3}
      style={{ flexShrink: 1, minWidth: 0 }}
    >
      {textProp(node.props, "text")}
    </T>
  );
}

export function drawText(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const tone = toneOfValue(node.props.tone);
  return (
    <T
      size={programTextRole(prop<ProgramTextSize>(node.props, "size", "md"))}
      weight={node.props.emphasise ? programTitleWeight(ctx.t) : undefined}
      color={programTextColor(ctx.t, tone)}
      clamp={8}
      style={{ flexShrink: 1, minWidth: 0 }}
    >
      {textProp(node.props, "text")}
    </T>
  );
}

export function drawCaption(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  return (
    <T
      size="caption"
      color={mutedText(ctx.t)}
      clamp={4}
      style={{ flexShrink: 1, minWidth: 0 }}
    >
      {textProp(node.props, "text")}
    </T>
  );
}

export function drawBadge(node: ElementNode, ctx: ProgramContext): JSX.Element {
  return (
    <AdwaitaBadge
      variant={programBadgeVariant(toneOfValue(node.props.tone))}
      size="sm"
    >
      {textProp(node.props, "text")}
    </AdwaitaBadge>
  );
}

export function drawCallout(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const tone = toneOfValue(node.props.tone);
  const title = textProp(node.props, "title");
  const glyph = tone === null ? "info" : (programToneGlyph(tone) ?? "info");

  return (
    <div
      style={{
        ...programColumnStyle(ctx.t),
        gap: 0,
        padding: innerGap(ctx.t),
        borderWidth: HAIRLINE,
        borderColor: programRule(ctx.t),
        borderRadius: ctx.t.radius.sm,
        backgroundColor: ctx.t.color.surface.sunken,
      }}
    >
      <div style={{ ...programRowStyle(ctx.t), alignItems: "start" }}>
        <AdwaitaIcon
          name={glyph}
          size={INLINE_GLYPH}
          color={programTextColor(ctx.t, tone ?? "info")}
          style={{ flexShrink: 0 }}
        />
        <div style={{ ...programColumnStyle(ctx.t), minWidth: 0 }}>
          {title === "" ? null : (
            <T
              size="list"
              weight={programTitleWeight(ctx.t)}
              color={programTextColor(ctx.t, tone)}
              clamp={2}
              style={{ minWidth: 0 }}
            >
              {title}
            </T>
          )}
          <T
            size="body"
            color={ctx.t.color.text.primary}
            clamp={6}
            style={{ minWidth: 0 }}
          >
            {textProp(node.props, "text")}
          </T>
        </div>
      </div>
    </div>
  );
}

/** The block's own text: the reference calls it `code`, mu's programs called it `text`. */
const codeOf = (props: Record<string, unknown>): string =>
  textProp(props, "code") === "" ? textProp(props, "text") : textProp(props, "code");

export function drawCode(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const language = textProp(node.props, "language");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: noteGapOf(ctx),
        padding: innerGap(ctx.t),
        borderRadius: ctx.t.radius.sm,
        backgroundColor: ctx.t.color.surface.sunken,
      }}
    >
      {language === "" ? null : (
        <T size="caption" color={mutedText(ctx.t)} clamp={1} style={{ minWidth: 0 }}>
          {language}
        </T>
      )}
      <T
        size="caption"
        color={ctx.t.color.text.primary}
        clamp={20}
        style={{
          fontFamily: ctx.t.type.fontFamilyMono,
          flexShrink: 1,
          minWidth: 0,
        }}
      >
        {codeOf(node.props)}
      </T>
    </div>
  );
}

/** The air between a block's own head line and its body. */
const noteGapOf = (ctx: ProgramContext): number => ctx.t.space.xs;

export function drawMetric(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const tone = toneOfValue(node.props.tone);
  const note = textOf(node.props.note);
  const source = sourceProp(node.props);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
      <T
        size="caption"
        color={mutedText(ctx.t)}
        clamp={2}
        style={{ minWidth: 0 }}
      >
        {textProp(node.props, "label")}
      </T>
      <T
        size={programTextRole(prop<ProgramTextSize>(node.props, "size", "lg"))}
        weight={programTitleWeight(ctx.t)}
        color={programTextColor(ctx.t, tone)}
        clamp={1}
        style={{ minWidth: 0 }}
      >
        {textProp(node.props, "value")}
      </T>
      {note === null ? null : (
        <T
          size="caption"
          color={programTextColor(ctx.t, tone === null ? "muted" : tone)}
          clamp={2}
          style={{ minWidth: 0 }}
        >
          {note}
        </T>
      )}
      <ProgramSourceNote ctx={ctx} source={source} />
    </div>
  );
}

/** Every pair a `KeyValue` was handed, in the shape it was written. */
function pairsOf(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "object" && value !== null)
    return Object.entries(value as Record<string, unknown>).map(
      ([label, cell]) => [label, cell],
    );
  return value === undefined || value === null ? [] : [value];
}

export function drawKeyValue(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  // A mu program wrote one pair positionally: `KeyValue("Builds", "412")` — the
  // reference hands `pairs` a map or a list, and a scalar in that slot is the old
  // shape's label. A scalar `value` prop is what the old shape put beside it.
  const given = node.props.pairs;
  const single =
    typeof given === "string" ||
    typeof given === "number" ||
    typeof given === "boolean";
  const pairs = single
    ? [[given, node.props.value ?? ""]]
    : pairsOf(given);

  return (
    <DetailRows ctx={ctx} rows={pairs} toneOfNode={toneOfValue(node.props.tone)} />
  );
}

/**
 * The rows of a detail list, joined by rules.
 *
 * One row per labelled fact: the label quiet on the left in mono, the value on
 * the right — mono when it is a figure, so a column of them lines up on its
 * digits. A `KeyValue` is this; an `Entity`'s facts are this; mu's old `Details`
 * block was this.
 */
function DetailRows(props: {
  ctx: ProgramContext;
  rows: unknown[];
  toneOfNode?: ProgramTone | null;
}): JSX.Element {
  const ctx = props.ctx;
  const pairs = props.rows;
  const worn = props.toneOfNode ?? null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
      }}
    >
      {pairs.map((row, index) => {
        const label = textCell(row, DETAIL_NAMES, 0) ?? cellText(row);
        const value = textCell(row, DETAIL_NAMES, 1) ?? "";
        const tone = toneOfValue(cellOf(row, DETAIL_NAMES, 2)) ?? worn;
        const figure = isFigure(value);
        const last = index === pairs.length - 1;

        return (
          <div
            key={`kv-${String(index)}`}
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                width: "100%",
                minWidth: 0,
                gap: innerGap(ctx.t),
                paddingTop: index === 0 ? 0 : innerGap(ctx.t),
                paddingBottom: last ? 0 : innerGap(ctx.t),
              }}
            >
              <T
                size="caption"
                color={mutedText(ctx.t)}
                clamp={2}
                style={{
                  fontFamily: ctx.t.type.fontFamilyMono,
                  flexShrink: 1,
                  minWidth: 0,
                }}
              >
                {label}
              </T>
              <div style={{ flexGrow: 1, minWidth: 0, minHeight: 1 }} />
              <T
                size="list"
                color={programTextColor(ctx.t, tone)}
                align="right"
                clamp={2}
                style={{
                  flexShrink: 1,
                  minWidth: 0,
                  fontFamily: figure ? ctx.t.type.fontFamilyMono : undefined,
                  whiteSpace: figure ? "nowrap" : undefined,
                }}
              >
                {value}
              </T>
            </div>
            {last ? null : (
              <div
                style={{
                  width: "100%",
                  height: HAIRLINE,
                  flexShrink: 0,
                  backgroundColor: programRule(ctx.t),
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function drawIcon(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const name = textProp(node.props, "name");
  const resolved = resolveIcon(name);
  const tone = toneOfValue(node.props.tone);

  if (resolved === "")
    return (
      <T size="caption" color={mutedText(ctx.t)} clamp={1} style={{ minWidth: 0 }}>
        {`no mark named "${name}"`}
      </T>
    );

  return (
    <AdwaitaIcon
      name={resolved}
      size={INLINE_GLYPH}
      color={programTextColor(ctx.t, tone)}
      style={{ flexShrink: 0 }}
    />
  );
}

/** How tall a program's picture stands before it is clicked open. */
const IMAGE_HEIGHT = 240;

/** One picture of a program, in the box the screen draws it in, with the alt
 *  line under it. `Image` is this; an `Entity`'s picture is this. */
function ImageTile(props: {
  ctx: ProgramContext;
  src: string;
  alt: string;
}): JSX.Element {
  const { ctx } = props;
  const read = programImage(process.cwd(), props.src);

  if (!read.ok)
    return (
      <T
        size="caption"
        color={programTextColor(ctx.t, "warning")}
        clamp={3}
        style={{ minWidth: 0 }}
      >
        {`Image("${props.src}"): ${read.error}`}
      </T>
    );

  return (
    <div style={programColumnStyle(ctx.t)}>
      <ZoomImage
        src={read.src}
        title={read.path}
        detail={props.alt === "" ? read.path : props.alt}
        box={{
          width: "100%",
          minWidth: 0,
          height: IMAGE_HEIGHT,
          backgroundColor: ctx.t.color.surface.sunken,
        }}
      />
      {props.alt === "" ? null : (
        <T
          size="caption"
          color={mutedText(ctx.t)}
          clamp={3}
          style={{ minWidth: 0 }}
        >
          {props.alt}
        </T>
      )}
    </div>
  );
}

export function drawImage(node: ElementNode, ctx: ProgramContext): JSX.Element {
  return (
    <ImageTile
      ctx={ctx}
      src={textProp(node.props, "src")}
      alt={textProp(node.props, "alt")}
    />
  );
}

export function drawFile(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const path = textProp(node.props, "path");
  const line = prop<number | null>(node.props, "line", null);

  return (
    <div style={{ ...programRowStyle(ctx.t), gap: figureGap(ctx.t) }}>
      <AdwaitaIcon
        name={iconForFile(path)}
        size={INLINE_GLYPH}
        color={mutedText(ctx.t)}
        style={{ flexShrink: 0 }}
      />
      <T
        size="list"
        color={ctx.t.color.text.primary}
        clamp={1}
        style={{
          minWidth: 0,
          fontFamily: ctx.t.type.fontFamilyMono,
        }}
      >
        {path}
      </T>
      {line === null ? null : (
        <T
          size="caption"
          color={mutedText(ctx.t)}
          clamp={1}
          style={{ flexShrink: 0, fontFamily: ctx.t.type.fontFamilyMono }}
        >
          {`:${String(line)}`}
        </T>
      )}
    </div>
  );
}

/** One link, however it was written: a bare URL, or {url, title?, note?}. */
const linkUrl = (link: unknown): string =>
  typeof link === "string" ? link : (textCell(link, ["url", "title", "note"], 0) ?? "");

const linkTitle = (link: unknown): string =>
  typeof link === "string" ? "" : (textCell(link, ["url", "title", "note"], 1) ?? "");

export function drawSources(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const links = listProp(node.props, "links");

  return (
    <div style={programColumnStyle(ctx.t)}>
      {links.map((link, index) => {
        const url = linkUrl(link);
        const title = linkTitle(link);
        const note =
          typeof link === "string" ? "" : (textCell(link, ["url", "title", "note"], 2) ?? "");
        return (
          <div key={`s-${String(index)}`} style={programColumnStyle(ctx.t)}>
            <div style={{ ...programRowStyle(ctx.t), alignItems: "start" }}>
              <AdwaitaIcon
                name="openInNew"
                size={INLINE_GLYPH}
                color={mutedText(ctx.t)}
                style={{ flexShrink: 0 }}
              />
              <div style={{ ...programColumnStyle(ctx.t), minWidth: 0 }}>
                <T
                  size="list"
                  color={ctx.t.color.text.primary}
                  clamp={2}
                  style={{ minWidth: 0 }}
                >
                  {title === "" ? url : title}
                </T>
                {title === "" || url === "" ? null : (
                  <T
                    size="caption"
                    color={mutedText(ctx.t)}
                    clamp={1}
                    style={{ minWidth: 0, fontFamily: ctx.t.type.fontFamilyMono }}
                  >
                    {url}
                  </T>
                )}
              </div>
            </div>
            {note === "" ? null : (
              <ProgramText value={note} ctx={ctx} size="caption" color={mutedText(ctx.t)} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const LIST_NAMES = ["title", "detail", "icon", "value", "tone"] as const;

export function drawList(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const items = listProp(node.props, "items");

  return (
    <div style={programColumnStyle(ctx.t)}>
      {items.map((item, index) => {
        const title = textCell(item, LIST_NAMES, 0) ?? cellText(item);
        const detail = textCell(item, LIST_NAMES, 1) ?? "";
        const icon = resolveIcon(textCell(item, LIST_NAMES, 2) ?? "");
        const value = textCell(item, LIST_NAMES, 3) ?? "";
        const tone = toneOfValue(cellOf(item, LIST_NAMES, 4));

        return (
          <div
            key={`l-${String(index)}`}
            style={{
              ...programColumnStyle(ctx.t),
              paddingTop: index === 0 ? 0 : innerGap(ctx.t),
              borderTopWidth: index === 0 ? 0 : HAIRLINE,
              borderColor: programRule(ctx.t),
            }}
          >
            <div style={{ ...programRowStyle(ctx.t), alignItems: "start" }}>
              {icon === "" ? null : (
                <AdwaitaIcon
                  name={icon}
                  size={INLINE_GLYPH}
                  color={programTextColor(ctx.t, tone)}
                  style={{ flexShrink: 0 }}
                />
              )}
              <T
                size="body"
                color={programTextColor(ctx.t, tone)}
                clamp={2}
                style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
              >
                {title}
              </T>
              {value === "" ? null : (
                <T
                  size="list"
                  color={programTextColor(ctx.t, tone)}
                  align="right"
                  clamp={1}
                  style={{
                    flexShrink: 0,
                    minWidth: 0,
                    fontFamily: isFigure(value) ? ctx.t.type.fontFamilyMono : undefined,
                  }}
                >
                  {value}
                </T>
              )}
            </div>
            {detail === "" ? null : (
              <T
                size="caption"
                color={mutedText(ctx.t)}
                clamp={3}
                style={{ minWidth: 0 }}
              >
                {detail}
              </T>
            )}
          </div>
        );
      })}
    </div>
  );
}

const KIND_WORD: Record<string, string> = {
  product: "product",
  place: "place",
  person: "person",
  org: "organisation",
  link: "link",
  other: "",
};

export function drawEntity(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const kind = prop<string | null>(node.props, "kind", null);
  const image = textProp(node.props, "image");
  const url = textProp(node.props, "url");
  const note = textProp(node.props, "note");
  const pairs = pairsOf(node.props.facts ?? null);

  return (
    <div style={programColumnStyle(ctx.t)}>
      <div style={{ ...programRowStyle(ctx.t), alignItems: "center" }}>
        <T
          size="title4"
          weight={programTitleWeight(ctx.t)}
          color={ctx.t.color.text.primary}
          clamp={2}
          style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
        >
          {textProp(node.props, "name")}
        </T>
        {kind === null || KIND_WORD[kind] === "" ? null : (
          <AdwaitaBadge variant="secondary" size="sm">
            {KIND_WORD[kind]}
          </AdwaitaBadge>
        )}
      </div>
      {image === "" ? null : <ImageTile ctx={ctx} src={image} alt="" />}
      {pairs.length === 0 ? null : <DetailRows ctx={ctx} rows={pairs} />}
      {note === "" ? null : (
        <T size="body" color={ctx.t.color.text.primary} clamp={6} style={{ minWidth: 0 }}>
          {note}
        </T>
      )}
      {url === "" ? null : (
        <T
          size="caption"
          color={mutedText(ctx.t)}
          clamp={1}
          style={{ minWidth: 0, fontFamily: ctx.t.type.fontFamilyMono }}
        >
          {url}
        </T>
      )}
    </div>
  );
}
