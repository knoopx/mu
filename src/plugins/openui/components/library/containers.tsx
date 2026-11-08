import { defineComponent, useTriggerAction, useStateField, reactive } from "@openuidev/react-lang";
import { useState } from "react";
import type { StyleDesc } from "@gpuix/react";
import { z } from "zod";
import {
  Button as AdwButton,
  Card,
  Carousel as AdwCarousel,
  Popover as AdwPopover,
  PopoverContent,
  PopoverTrigger,
  useAdwaita,
} from "adwaita-gpuix";
import {
  GAP,
  GAP_TOKENS,
  TONE_TOKENS,
  flexStyle,
  type GapToken,
  type ToneToken,
} from "../../lib/tokens";
import { toneColor } from "../../lib/theme";



const RADIUS_TOKENS = ["none", "sm", "md", "lg", "card", "full"] as const;

export const Box = defineComponent({
  name: "Box",
  props: z.object({
    children: z.array(z.any()).optional().describe("Contents, in order."),
    direction: z
      .enum(["row", "column"])
      .optional()
      .describe('Main axis (default "column").'),
    gap: z.enum(GAP_TOKENS).optional().describe("Spacing between children."),
    padding: z
      .enum(GAP_TOKENS)
      .optional()
      .describe("Inner padding (\"m\" or \"l\" when the Box has a fill)."),
    background: z
      .union([z.enum(TONE_TOKENS), z.string()])
      .optional()
      .describe(
        'Fill for a control, a swatch or a semantic tint ("accent", "warning"). Omit for a flat group — the default paints nothing.',
      ),
    radius: z.enum(RADIUS_TOKENS).optional().describe('Corner radius (default "card").'),
    width: z.number().optional().describe("Fixed width in px."),
    height: z.number().optional().describe("Fixed height in px."),
    grow: z.number().optional().describe("Flex grow weight inside a Row."),
  }),
  description:
    "Layout group: direction, gap, padding. Flat by default — it paints no fill and no outline. Pass `background` only for a control, a swatch or a semantic tint, never to group content.",
  component: ({ props, renderNode }) => {
    const t = useAdwaita();
    const style: StyleDesc = {
      ...flexStyle({
        direction: props.direction ?? "column",
        gap: props.gap ?? "m",
      }),
      width: props.width,
      height: props.height,
      flexGrow: props.grow,
      borderRadius:
        props.radius === "none"
          ? 0
          : props.radius === "sm"
            ? t.radius.sm
            : props.radius === "md"
              ? t.radius.xs
              : props.radius === "lg" || props.radius === "card"
                ? t.radius.lg
                : props.radius === "full"
                  ? t.radius.full
                  : t.radius.lg,
      borderWidth: 0,
    };
    if (props.padding) {
      style.padding = GAP[props.padding as GapToken];
    }
    if (props.background) {
      style.backgroundColor = (TONE_TOKENS as readonly string[]).includes(props.background)
        ? toneColor(t, props.background as ToneToken)
        : props.background;
    }
    return <div style={style}>{renderNode(props.children)}</div>;
  },
});

export const Carousel = defineComponent({
  name: "Carousel",
  props: z.object({
    children: z.array(z.any()).describe("One component per slide."),
    visible: z
      .number()
      .int()
      .min(1)
      .max(6)
      .optional()
      .describe("How many slides are visible (default 3)."),
  }),
  description:
    "Horizontally swipeable strip of equal slides: photos, days, options, flashcards.",
  component: ({ props, renderNode }) => (
    <AdwCarousel visible={props.visible ?? 3} style={{ width: "100%" }}>
      {renderNode(props.children)}
    </AdwCarousel>
  ),
});

export const Popover = defineComponent({
  name: "Popover",
  props: z.object({
    label: z.string().describe("Text on the button that opens the panel."),
    children: z.array(z.any()).describe("Content shown in the panel."),
  }),
  description:
    "A flat verb that opens a small group hanging from it — the header bar's way to carry a filter, a sort or a view option: label it with the current choice and put option rows, switches and a separator inside it. Never a page, a table, a chart or a nested group inside a popover.",
  component: ({ props, renderNode }) => {
    const [open, setOpen] = useState(false);
    return (
      <AdwPopover open={open} onOpenChange={setOpen}>
        <PopoverTrigger>
          <AdwButton variant="secondary" onClick={() => setOpen(!open)}>
            {props.label}
          </AdwButton>
        </PopoverTrigger>
        <PopoverContent>{renderNode(props.children)}</PopoverContent>
      </AdwPopover>
    );
  },
});

export const Pressable = defineComponent({
  name: "Pressable",
  props: z.object({
    children: z.array(z.any()).describe("Content of the surface."),
    selected: reactive(
      z.boolean().optional().describe("Highlight it as the current choice."),
    ),
    label: z
      .string()
      .optional()
      .describe("Message sent to the assistant when it is pressed."),
    padding: z.enum(GAP_TOKENS).optional().describe("Inner padding (default \"m\")."),
  }),
  description:
    "A tappable option: flat on the surface, tinted on hover and filled while selected — state is fill, never an outline.",
  component: ({ props, renderNode }) => {
    const t = useAdwaita();
    const selected = useStateField("selected", props.selected);
    const trigger = useTriggerAction();
    return (
      <Card
        style={{
          width: "100%",
          hover: { backgroundColor: t.color.surface.buttonHover },
          active: { backgroundColor: t.color.surface.buttonActive },
          ...(selected.value ? { backgroundColor: t.color.accent.tint } : {}),
        }}
      >
        <div
          style={{ width: "100%", height: "100%", pointerEvents: "none" }}
          onClick={() => {
            if (!props.label) return;
            void trigger(props.label);
          }}
        >
          {renderNode(props.children)}
        </div>
      </Card>
    );
  },
});

export const Flashcard = defineComponent({
  name: "Flashcard",
  props: z.object({
    front: z.any().describe("What is shown first: a prompt or term."),
    back: z.any().describe("What is revealed: the answer."),
    hint: z
      .string()
      .optional()
      .describe('Caption under the card, e.g. "tap to flip".'),
  }),
  description:
    "Card that flips between front and back when tapped. Put several in a Carousel or Grid.",
  component: ({ props, renderNode }) => {
    const t = useAdwaita();
    const [flipped, setFlipped] = useState(false);
    return (
      <Card
        style={{
          width: "100%",
          minHeight: 120,
          hover: { backgroundColor: t.color.surface.buttonHover },
        }}
      >
        <div
          style={{ width: "100%", gap: 8 }}
          onClick={() => setFlipped((was) => !was)}
        >
          {renderNode(flipped ? props.back : props.front)}
          {props.hint ? (
            <div
              style={{
                fontSize: t.type.caption,
                fontFamily: t.type.fontFamily,
                color: t.color.text.dim,
              }}
            >
              {props.hint}
            </div>
          ) : null}
        </div>
      </Card>
    );
  },
});
