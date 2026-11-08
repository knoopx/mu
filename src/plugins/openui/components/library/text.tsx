import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod";
import type { GpuixTheme } from "@gpuix/react";
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Heading,
  Icon,
  JsonView,
  T,
  useAdwaita,
} from "adwaita-gpuix";
import {
  TONE_TOKENS,

  type ToneToken,
} from "../../lib/tokens";
import { toneColor } from "../../lib/theme";

export const HeadingBlock = defineComponent({
  name: "Heading",
  props: z.object({
    text: z.string().describe("Heading text."),
    level: z
      .number()
      .int()
      .min(1)
      .max(6)
      .optional()
      .describe("Heading level: 1 (largest) to 6 (default 2)."),
  }),
  description: "Section heading. Use level 1 for the title of the program.",
  component: ({ props }) => (
    <Heading level={props.level as 1 | 2 | 3 | 4 | 5 | 6 | undefined}>
      {props.text}
    </Heading>
  ),
});


function deltaTone(subtext: string, tone?: ToneToken): ToneToken {
  if (tone && tone !== "default") return tone;
  if (subtext.startsWith("+")) return "success";
  if (subtext.startsWith("-")) return "destructive";
  return "muted";
}

export const Text = defineComponent({
  name: "Text",
  props: z.object({
    value: z.string().describe("Primary line."),
    subtext: z.string().optional().describe("Secondary line below."),
    tone: z
      .enum(TONE_TOKENS)
      .optional()
      .describe('Colour tone: "muted" to de-emphasise, "success"/"destructive" for deltas.'),
    size: z.enum(["sm", "md", "lg"]).optional().describe("Text size (default md)."),
    align: z.enum(["left", "center", "right"]).optional().describe("Text alignment."),
  }),
  description:
    "One line of prose with optional subtext. A subtext starting with +/- is coloured green/red automatically.",
  component: ({ props }) => {
    const t = useAdwaita();
    const size =
      props.size === "sm" ? "caption" : props.size === "lg" ? "title4" : "body";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 2, width: "100%" }}>
        <T
          size={size}
          color={toneColor(t, props.tone as ToneToken)}
          align={props.align}
        >
          {props.value}
        </T>
        {props.subtext ? (
          <T
            size="caption"
            color={toneColor(t, deltaTone(props.subtext, props.tone as ToneToken))}
            align={props.align}
          >
            {props.subtext}
          </T>
        ) : null}
      </div>
    );
  },
});

export const TextContent = defineComponent({
  name: "TextContent",
  props: z.object({ content: z.string().describe("GitHub-flavoured markdown.") }),
  description:
    "Markdown block: headings, lists, tables, fenced code, links. Best for long prose.",
  component: ({ props }) => (
    <markdown source={props.content} theme={useGpuixTheme()} style={{ width: "100%" }} />
  ),
});

export const CodeBlock = defineComponent({
  name: "CodeBlock",
  props: z.object({
    code: z.string().describe("Source to display."),
    language: z.string().optional().describe('Language alias, e.g. "ts", "bash".'),
    showLineNumbers: z.boolean().optional().describe("Render a line-number gutter."),
  }),
  description:
    "Syntax-highlighted code flush on the view surface, scrolling horizontally — no panel fill, no frame.",
  component: ({ props }) => {
    const t = useAdwaita();
    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          borderRadius: t.radius.lg,
          borderWidth: 0,
          overflow: "hidden",
        }}
      >
        <code
          code={props.code}
          language={props.language}
          showLineNumbers={props.showLineNumbers}
          theme={useGpuixTheme()}
          style={{ width: "100%", padding: 12 }}
        />
      </div>
    );
  },
});

export const KeyValue = defineComponent({
  name: "KeyValue",
  props: z.object({
    label: z.string().describe("Field name."),
    value: z.string().describe("Field value."),
    tone: z.enum(TONE_TOKENS).optional().describe("Colour of the value."),
  }),
  description: "Inline label/value pair with a dimmed label.",
  component: ({ props }) => {
    const t = useAdwaita();
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 8,
          alignItems: "baseline",
          width: "100%",
        }}
      >
        <T size="caption" color={t.color.text.dim} weight={600}>
          {props.label}
        </T>
        <T
          size="body"
          weight={600}
          color={toneColor(t, props.tone as ToneToken)}
          style={{ flexGrow: 1, minWidth: 0 }}
        >
          {props.value}
        </T>
      </div>
    );
  },
});

export const Metric = defineComponent({
  name: "Metric",
  props: z.object({
    label: z.string().describe("Metric name."),
    value: z.string().describe("The number, as display text."),
    subtext: z.string().optional().describe("Delta or note under the value."),
    tone: z.enum(TONE_TOKENS).optional().describe("Colour of the subtext."),
  }),
  description: "KPI block: dim label, large value, optional delta.",
  component: ({ props }) => {
    const t = useAdwaita();
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          width: "100%",
          minWidth: 0,
        }}
      >
        <T size="caption" color={t.color.text.dim} weight={600}>
          {props.label}
        </T>
        <text style={{ color: t.color.text.primary, fontSize: 28, fontWeight: 700, lineHeight: 32 }}>
          {props.value}
        </text>
        {props.subtext ? (
          <T
            size="caption"
            color={toneColor(t, deltaTone(props.subtext, props.tone as ToneToken))}
          >
            {props.subtext}
          </T>
        ) : null}
      </div>
    );
  },
});

export const Callout = defineComponent({
  name: "Callout",
  props: z.object({
    title: z.string().optional().describe("Callout heading."),
    text: z.string().describe("Callout body."),
    variant: z
      .enum(["default", "success", "warning", "destructive"])
      .optional()
      .describe("Semantic variant (default)."),
  }),
  description: "Tinted notice block for status, warnings and explanations.",
  component: ({ props }) => (
    <Alert variant={props.variant ?? "default"} style={{ width: "100%" }}>
      {props.title ? <AlertTitle>{props.title}</AlertTitle> : null}
      <AlertDescription>{props.text}</AlertDescription>
    </Alert>
  ),
});

export const Image = defineComponent({
  name: "Image",
  props: z.object({
    src: z.string().describe("http(s) URL, filesystem path, or data: URL."),
    alt: z.string().optional().describe("Accessible description."),
    fit: z
      .enum(["contain", "cover", "fill", "scaleDown", "none"])
      .optional()
      .describe("How the image fits its box (default contain)."),
    height: z.number().optional().describe("Box height in px (default 240)."),
  }),
  description: "Raster image from a URL, data URL or local path.",
  component: ({ props }) => (
    <img
      src={props.src}
      alt={props.alt ?? ""}
      objectFit={props.fit ?? "contain"}
      style={{
        width: "100%",
        height: props.height ?? 240,
        borderRadius: 8,
        overflow: "hidden",
      }}
    />
  ),
});

export const Json = defineComponent({
  name: "Json",
  props: z.object({
    data: z.any().describe("Any JSON value to inspect."),
    name: z.string().optional().describe("Optional caption."),
  }),
  description: "Collapsible JSON tree, for showing structured data to the user.",
  component: ({ props }) => (
    <JsonView
      src={props.data}
      name={props.name}
      collapsed={2}
      style={{ width: "100%" }}
    />
  ),
});


function useGpuixTheme(): GpuixTheme {
  const t = useAdwaita();
  return {
    appearance: t.scheme === "dark" ? "dark" : "light",
    bg: t.color.surface.view,
    text: t.color.text.primary,
    textMuted: t.color.text.dim,
    
    
    border: t.color.surface.view,
    accent: t.color.accent.base,
    fontSans: t.type.fontFamily,
    fontMono: t.type.fontFamilyMono,
  };
}

export const Caption = defineComponent({
  name: "Caption",
  props: z.object({
    text: z.string().describe("Secondary text."),
    tone: z.enum(TONE_TOKENS).optional().describe("Colour tone (default muted)."),
  }),
  description: "Small secondary line under a title, figure or row.",
  component: ({ props }) => {
    const t = useAdwaita();
    return (
      <T
        size="caption"
        color={toneColor(t, (props.tone ?? "muted") as ToneToken)}
        style={{ width: "100%" }}
      >
        {props.text}
      </T>
    );
  },
});

export const Quote = defineComponent({
  name: "Quote",
  props: z.object({
    text: z.string().describe("The quotation."),
    cite: z.string().optional().describe("Who or what it came from."),
  }),
  description: "Quotation or aside with an accent rule down the left.",
  component: ({ props }) => {
    const t = useAdwaita();
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          width: "100%",
          paddingLeft: 12,
          borderLeftWidth: 3,
          borderColor: t.color.accent.base,
        }}
      >
        <T size="body" color={t.color.text.primary}>
          {props.text}
        </T>
        {props.cite ? (
          <T size="caption" color={t.color.text.dim}>
            {`— ${props.cite}`}
          </T>
        ) : null}
      </div>
    );
  },
});

export const Link = defineComponent({
  name: "Link",
  props: z.object({
    text: z.string().describe("Label shown."),
    url: z.string().describe("http(s) URL."),
  }),
  description:
    "An external link shown as accent text with the URL underneath; put it in a Button's @OpenUrl to make it openable.",
  component: ({ props }) => {
    const t = useAdwaita();
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: 6,
          alignItems: "center",
          width: "100%",
        }}
      >
        <T size="body" weight={600} color={t.color.accent.base}>
          {props.text || props.url}
        </T>
        <Icon name="arrowForward" size={14} color={t.color.text.dim} />
        {props.text !== props.url ? (
          <T
            size="caption"
            color={t.color.text.dim}
            style={{
              fontFamily: t.type.fontFamilyMono,
              lineClamp: 1,
              textOverflow: "ellipsis",
              minWidth: 0,
            }}
          >
            {props.url}
          </T>
        ) : null}
      </div>
    );
  },
});
