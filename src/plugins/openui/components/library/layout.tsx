import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod";
import {
  Badge,
  Card as AdwCard,
  CardTitle as AdwCardTitle,
  CardDescription as AdwCardDescription,
  type BadgeVariant,
} from "adwaita-gpuix";
import {
  ALIGN_TOKENS,
  GAP_TOKENS,
  JUSTIFY_TOKENS,
  TONE_TOKENS,
  flexStyle,
  gapPx,
  type ToneToken,
} from "../../lib/tokens";

const flexProps = {
  direction: z
    .enum(["row", "column"])
    .optional()
    .describe('Main axis: "column" (default) or "row".'),
  gap: z
    .enum(GAP_TOKENS)
    .optional()
    .describe('Spacing between children (default "m").'),
  align: z.enum(ALIGN_TOKENS).optional().describe("Cross-axis alignment."),
  justify: z.enum(JUSTIFY_TOKENS).optional().describe("Main-axis distribution."),
  wrap: z.boolean().optional().describe("Wrap children onto new lines."),
  grow: z
    .boolean()
    .optional()
    .describe("Take the space left by siblings — the root container of a window sets it so its status bar sits on the bottom edge."),
};

const childrenProp = z
  .array(z.any())
  .describe("Ordered children (component refs or strings).");

export const Stack = defineComponent({
  name: "Stack",
  props: z.object({ children: childrenProp, ...flexProps }),
  description:
    'Flex container and the usual program root. direction "row"|"column" (default "column"), gap "none"|"xs"|"s"|"m"|"l"|"xl"|"2xl" (default "m"), align, justify, wrap.',
  component: ({ props, renderNode }) => (
    <div style={{ ...flexStyle(props), width: "100%" }}>
      {renderNode(props.children)}
    </div>
  ),
});

export const Row = defineComponent({
  name: "Row",
  props: z.object({ children: childrenProp, ...flexProps }),
  description:
    "Horizontal Stack (direction is fixed to row). Use for toolbars, label/value pairs, button groups.",
  component: ({ props, renderNode }) => (
    <div
      style={{
        ...flexStyle({
          ...props,
          direction: "row",
          align: props.align ?? "center",
        }),
        width: "100%",
      }}
    >
      {renderNode(props.children)}
    </div>
  ),
});

export const Grid = defineComponent({
  name: "Grid",
  props: z.object({
    children: childrenProp,
    columns: z
      .number()
      .int()
      .min(1)
      .max(6)
      .optional()
      .describe("Equal-width columns (default 2)."),
    gap: z.enum(GAP_TOKENS).optional().describe("Spacing between cells."),
  }),
  description:
    "Equal-column grid. Columns are numeric; children flow into cells in order.",
  component: ({ props, renderNode }) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: props.columns ?? 2,
        gap: gapPx(props.gap),
        width: "100%",
      }}
    >
      {renderNode(props.children)}
    </div>
  ),
});

export const Card = defineComponent({
  name: "Card",
  props: z.object({
    title: z.string().optional().describe("Section heading, flush on the surface."),
    children: childrenProp,
    ...flexProps,
    grow: z.number().optional().describe("Flex grow weight when sharing a Row."),
  }),
  description:
    "Section: heading plus spacing on the view surface. Paints no panel, no frame and no shadow. Accepts the same flex props as Stack. Never nest it inside another Card.",
  component: ({ props, renderNode }) => (
    <AdwCard title={props.title} style={{ flexGrow: props.grow ?? 0, minWidth: 0 }}>
      <div style={{ ...flexStyle(props), width: "100%" }}>
        {renderNode(props.children)}
      </div>
    </AdwCard>
  ),
});

export const CardHeader = defineComponent({
  name: "CardHeader",
  props: z.object({
    title: z.string().describe("Heading of the block."),
    subtitle: z.string().optional().describe("Secondary line under the title."),
    trailing: z.any().optional().describe("Right-aligned child (e.g. a Badge)."),
  }),
  description:
    "Section heading: title + optional dimmed subtitle + optional trailing element. Paints nothing.",
  component: ({ props, renderNode }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flexGrow: 1,
          minWidth: 0,
        }}
      >
        <AdwCardTitle>{props.title}</AdwCardTitle>
        {props.subtitle ? (
          <AdwCardDescription>{props.subtitle}</AdwCardDescription>
        ) : null}
      </div>
      {props.trailing != null ? (
        <div style={{ flexShrink: 0 }}>{renderNode(props.trailing)}</div>
      ) : null}
    </div>
  ),
});

export const Divider = defineComponent({
  name: "Divider",
  props: z.object({
    orientation: z
      .enum(["horizontal", "vertical"])
      .optional()
      .describe("Direction of the gap (default horizontal)."),
    size: z.enum(GAP_TOKENS).optional().describe("Whitespace size (default \"l\")."),
  }),
  description:
    "Invisible whitespace between blocks, like Libadwaita's .spacer — it paints no line. Prefer a Stack/Row gap; never use it as section chrome.",
  component: ({ props }) => {
    const px = gapPx(props.size ?? "l");
    return props.orientation === "vertical" ? (
      <div style={{ width: px, alignSelf: "stretch", pointerEvents: "none" }} />
    ) : (
      <div style={{ width: "100%", height: px, pointerEvents: "none" }} />
    );
  },
});

export const Spacer = defineComponent({
  name: "Spacer",
  props: z.object({
    size: z.number().optional().describe("Fixed size in px; omit to flex-grow."),
  }),
  description: "Invisible space. Grows to fill the parent unless a px size is given.",
  component: ({ props }) => (
    <div
      style={
        typeof props.size === "number"
          ? { width: props.size, height: props.size }
          : { flexGrow: 1, minHeight: 1, minWidth: 1 }
      }
    />
  ),
});

const BADGE_TONE: Record<ToneToken, BadgeVariant> = {
  default: "default",
  muted: "secondary",
  accent: "outline",
  success: "success",
  warning: "warning",
  destructive: "destructive",
};

export const Tag = defineComponent({
  name: "Tag",
  props: z.object({
    label: z.string().describe("Badge text."),
    tone: z.enum(TONE_TOKENS).optional().describe("Colour tone (default default)."),
  }),
  description: "Small pill label for status or metadata.",
  component: ({ props }) => (
    <Badge variant={BADGE_TONE[props.tone as ToneToken] ?? "default"}>
      {props.label}
    </Badge>
  ),
});
