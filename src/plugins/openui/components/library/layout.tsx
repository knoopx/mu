/**
 * The layout area of the language: what a program arranges things in.
 *
 * The reference app's rule holds — a program composes a page and the app owns
 * the spacing tiers — so a `Stack` left without a `gap` stands in the group
 * tier, the `Screen` body in the section tier, and only a `Row` or `Grid` that
 * says a number gets its own.
 */

import type { JSX } from "react";
import { defineComponent } from "@openuidev/lang-core";
import {
  Carousel as AdwaitaCarousel,
  CarouselItem,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Icon as AdwaitaIcon,
  Tabs as AdwaitaTabs,
  TabsContent,
  T,
} from "adwaita-gpuix";
import { z } from "zod/v4";

import type { ElementNode } from "@openuidev/lang-core";

import { HAIRLINE, INLINE_GLYPH, figureGap } from "../../../core/lib/ui/tokens";
import {
  groupGap,
  panePad,
  paneRadius,
  programGap,
  programTitleWeight,
  sectionGap,
} from "../../lib/tokens";
import {
  programEdge,
  programSurfaceFill,
  programTextColor,
  programToneGlyph,
  toneOfValue,
} from "../../lib/theme";
import type { ProgramContext } from "./context";
import {
  listProp,
  programColumnStyle,
  prop,
  reactive,
  textProp,
} from "./context";

export const Screen = defineComponent({
  name: "Screen",
  description:
    "the program's body: the blocks of one screen, stacked in the app's section gap",
  props: z.object({
    children: z.array(z.any()),
  }),
  component: drawScreen,
});

export const Stack = defineComponent({
  name: "Stack",
  description:
    "a vertical column of blocks; leave gap unset and the app uses its group tier",
  props: z.object({
    children: z.array(z.any()),
    gap: z.number().optional(),
  }),
  component: drawStack,
});

export const Row = defineComponent({
  name: "Row",
  description:
    "a horizontal line of blocks — the one place a gap number is usually worth setting",
  props: z.object({
    children: z.array(z.any()),
    gap: z.number().optional(),
    align: z.enum(["start", "center", "end"]).nullable().optional(),
    justify: z
      .enum(["start", "center", "end", "space-between"])
      .nullable()
      .optional(),
  }),
  component: drawRow,
});

export const Grid = defineComponent({
  name: "Grid",
  description: "the children laid out in equal columns",
  props: z.object({
    children: z.array(z.any()),
    columns: z.number().nullable().optional(),
    gap: z.number().optional(),
  }),
  component: drawGrid,
});

/**
 * What a block of the screen takes — and what mu's retired `Pane` took, slot
 * for slot, which is why `aliases.ts` reuses this rather than holding a second
 * copy of the same six lines.
 */
export const cardProps = z.object({
  title: z.string().nullable(),
  children: z.array(z.any()),
  surface: z.enum(["card", "sunken", "plain"]).nullable().optional(),
  tone: z.string().nullable().optional(),

  /** The count, the elapsed time, the state — the figure a block is read by. */
  trailing: z.array(z.any()).nullable().optional(),
});

export const Card = defineComponent({
  name: "Card",
  description:
    "one block of the screen, framed by the app: its title, the blocks inside it, and the one fact that counts it on the title's right. Every block of a reply is wrapped in one",
  props: cardProps,
  component: drawCard,
});

/**
 * A block the reader opens.
 *
 * The reference's `Details` is a collapsible, and its own detail list is
 * `KeyValue` — so mu's old `Details(rows)` block lives on as an alias and this
 * name means what the reference says it means. Which one is open is a
 * `$variable` when the program bound one; with none bound the widget holds it,
 * because a block a reader cannot open is a block that hides its contents for no
 * reason.
 */
export const Details = defineComponent({
  name: "Details",
  description:
    "a block the reader opens: its title, what is inside it, and whether it starts open",
  props: z.object({
    title: z.string(),
    children: z.array(z.any()),
    open: reactive(z.boolean()).nullable().optional(),
  }),
  component: drawDetails,
});

/** A row of blocks the reader walks one at a time. */
export const Carousel = defineComponent({
  name: "Carousel",
  description:
    "a row of blocks the reader walks sideways, one or two at a time",
  props: z.object({
    children: z.array(z.any()),
    visible: z.number().nullable().optional(),
  }),
  component: drawCarousel,
});

export const Divider = defineComponent({
  name: "Divider",
  description: "a rule across the screen",
  props: z.object({}),
  component: drawDivider,
});

export const Spacer = defineComponent({
  name: "Spacer",
  description: "the air that pushes what follows it to the far end of a Row",
  props: z.object({}),
  component: drawSpacer,
});

/* ------------------------------------------------------------------ draws */

function drawScreen(node: ElementNode, ctx: ProgramContext): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: sectionGap(ctx.t),
      }}
    >
      {ctx.nodes(listProp(node.props, "children"))}
    </div>
  );
}

function drawStack(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const gap = node.props.gap;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: typeof gap === "number" ? programGap(ctx.t, gap) : groupGap(ctx.t),
      }}
    >
      {ctx.nodes(listProp(node.props, "children"))}
    </div>
  );
}

function drawRow(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const gap = node.props.gap;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: node.props.align === "center" ? "center" : "start",
        justifyContent:
          node.props.justify === "space-between" ? "space-between" : "start",
        width: "100%",
        minWidth: 0,
        flexWrap: "wrap",
        gap: typeof gap === "number" ? programGap(ctx.t, gap) : groupGap(ctx.t),
      }}
    >
      {ctx.nodes(listProp(node.props, "children"))}
    </div>
  );
}

/** Children in rows of `columns`; the last row is padded so cells stay equal. */
function inRows(items: readonly unknown[], columns: number): unknown[][] {
  const width = Math.max(1, Math.floor(columns));
  const rows: unknown[][] = [];
  for (let at = 0; at < items.length; at += width)
    rows.push(items.slice(at, at + width));
  return rows;
}

function drawGrid(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const items = listProp(node.props, "children");
  const rows = inRows(items, prop(node.props, "columns", 2));
  const gap = node.props.gap;
  const columnGap =
    typeof gap === "number" ? programGap(ctx.t, gap) : sectionGap(ctx.t);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: columnGap,
      }}
    >
      {rows.map((row, rowIndex) => (
        <div
          key={`row-${String(rowIndex)}`}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "start",
            width: "100%",
            minWidth: 0,
            gap: columnGap,
          }}
        >
          {row.map((child, childIndex) => (
            <div
              key={`cell-${String(rowIndex)}-${String(childIndex)}`}
              style={{
                display: "flex",
                flexGrow: 1,
                flexBasis: 0,
                minWidth: 0,
              }}
            >
              {ctx.node(child)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function drawCard(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const title = textProp(node.props, "title");
  const surface = prop<"card" | "sunken" | "plain" | null>(
    node.props,
    "surface",
    "card",
  );
  const tone = toneOfValue(node.props.tone);
  const trailing = listProp(node.props, "trailing");
  const glyph = tone === null ? null : programToneGlyph(tone);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: groupGap(ctx.t),
        padding: panePad(ctx.t),
        borderRadius: paneRadius(ctx.t),
        backgroundColor: programSurfaceFill(ctx.t, surface),
        borderWidth: HAIRLINE,
        borderColor: programEdge(ctx.t, tone),
      }}
    >
      {title === "" && trailing.length === 0 ? null : (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            minWidth: 0,
            gap: figureGap(ctx.t),
          }}
        >
          {glyph === null ? null : (
            <AdwaitaIcon
              name={glyph}
              size={INLINE_GLYPH}
              color={programTextColor(ctx.t, tone)}
              style={{ flexShrink: 0 }}
            />
          )}
          {title === "" ? null : (
            <T
              size="title4"
              weight={programTitleWeight(ctx.t)}
              color={ctx.t.color.text.primary}
              clamp={2}
              style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
            >
              {title}
            </T>
          )}
          {trailing.length === 0 ? null : (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                flexShrink: 0,
                minWidth: 0,
                gap: figureGap(ctx.t),
              }}
            >
              {ctx.nodes(trailing)}
            </div>
          )}
        </div>
      )}
      {ctx.nodes(listProp(node.props, "children"))}
    </div>
  );
}

function drawDetails(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const bound = ctx.binding(node.props.open, false);
  const controlled = bound.name !== "";

  return (
    <Collapsible
      {...(controlled ? { open: bound.value === true } : { defaultOpen: true })}
      {...(controlled
        ? { onOpenChange: (next: boolean) => bound.set(next) }
        : {})}
      style={{ width: "100%", minWidth: 0 }}
    >
      <CollapsibleTrigger>
        <T
          size="list"
          weight={programTitleWeight(ctx.t)}
          color={ctx.t.color.text.primary}
          clamp={2}
          style={{ minWidth: 0 }}
        >
          {textProp(node.props, "title")}
        </T>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div style={programColumnStyle(ctx.t)}>
          {ctx.nodes(listProp(node.props, "children"))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function drawCarousel(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const items = listProp(node.props, "children");
  const visible = Math.max(1, Math.floor(prop(node.props, "visible", 1)));

  return (
    <AdwaitaCarousel visible={visible} style={{ width: "100%", minWidth: 0 }}>
      {items.map((item, index) => (
        <CarouselItem key={`c-${String(index)}`}>
          <div style={programColumnStyle(ctx.t)}>{ctx.node(item)}</div>
        </CarouselItem>
      ))}
    </AdwaitaCarousel>
  );
}

function drawDivider(_node: ElementNode, ctx: ProgramContext): JSX.Element {
  return (
    <div
      style={{
        width: "100%",
        height: HAIRLINE,
        flexShrink: 0,
        backgroundColor: ctx.t.color.divider.default,
      }}
    />
  );
}

function drawSpacer(_node: ElementNode, _ctx: ProgramContext): JSX.Element {
  return <div style={{ flexGrow: 1, minWidth: 0, minHeight: 1 }} />;
}

/**
 * Several blocks in one place.
 *
 * Which tab is open is a `$variable` of the program, because a tab is a filter:
 * the screen the reader is looking at is the one they chose, and a program that
 * shows a different block per tab reads that variable to build it. With no
 * variable bound the screen stays on the first tab — a drawer has no state of
 * its own, and a screen that forgot what the reader opened on every repaint
 * would be worse than one that never moved.
 */
export const Tabs = defineComponent({
  name: "Tabs",
  description:
    "several blocks in one place: the titles of the tabs, the blocks under them, and the $variable that says which one is open",
  props: z.object({
    labels: z.array(z.union([z.string(), z.number()])),
    children: z.array(z.any()),
    value: reactive(z.string()).nullable().optional(),
  }),
  component: drawTabs,
});

/** The id of a tab by its place, which is what pairs a title with a block. */
const tabId = (index: number): string => `t${String(index)}`;

function drawTabs(node: ElementNode, ctx: ProgramContext): JSX.Element {
  // The reference names these `labels` and `children`; mu's programs wrote
  // `titles` and `blocks`, and both spellings still arrive.
  const titles = listProp(
    node.props,
    "labels",
    listProp(node.props, "titles"),
  ).map((title) => String(title ?? ""));
  const blocks = listProp(
    node.props,
    "children",
    listProp(node.props, "blocks"),
  );
  const items = titles.map((label, index) => ({ id: tabId(index), label }));
  const binding = ctx.binding(node.props.value, items[0]?.id ?? "");
  const current = binding.value === "" ? (items[0]?.id ?? "") : binding.value;

  return (
    <AdwaitaTabs
      items={items}
      value={current}
      onSelect={(id: string) => binding.set(id)}
    >
      {blocks.map((block, index) => (
        <TabsContent key={`tab-${String(index)}`} value={tabId(index)}>
          {ctx.node(block)}
        </TabsContent>
      ))}
    </AdwaitaTabs>
  );
}
