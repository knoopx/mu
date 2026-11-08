import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Icon as AdwIcon,
  T,
  type IconName,
} from "adwaita-gpuix";
import { useAdwaita } from "adwaita-gpuix";
import { GAP } from "../../lib/tokens";

/**
 * Media ported from open-intelligent-ui. GPUI paints no map tiles, no web
 * views and no YouTube player, so those arrive as what the GPU can actually
 * draw: a thumbnail with the link, and an icon that is a first-class child.
 */

const ICON_SIZES = { sm: 14, md: 18, lg: 24, xl: 32 } as const;

export const Glyph = defineComponent({
  name: "Icon",
  props: z.object({
    name: z
      .string()
      .describe('adwaita icon name, e.g. "mapPin", "clock", "bell", "fileText".'),
    size: z
      .enum(["sm", "md", "lg", "xl"])
      .optional()
      .describe('Visual size (default "md").'),
    tone: z
      .enum(["default", "muted", "accent", "success", "warning", "destructive"])
      .optional()
      .describe("Colour tone (default accent)."),
  }),
  description:
    "Inline icon: next to a Text run, inside a Row, or as a list marker. Names come from the adwaita icon set.",
  component: ({ props }) => {
    const t = useAdwaita();
    const color =
      props.tone === "muted"
        ? t.color.text.dim
        : props.tone === "success"
          ? t.color.functional.success
          : props.tone === "warning"
            ? t.color.functional.warning
            : props.tone === "destructive"
              ? t.color.functional.destructive
              : props.tone === "default"
                ? t.color.text.primary
                : t.color.accent.base;
    return <AdwIcon name={props.name as IconName} size={ICON_SIZES[props.size ?? "md"]} color={color} />;
  },
});

function videoId(input: string): string | null {
  const raw = (input ?? "").trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return raw;
  const match = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shortes?\/)([A-Za-z0-9_-]{11})/.exec(raw);
  return match?.[1] ?? null;
}

export const YouTube = defineComponent({
  name: "YouTube",
  props: z.object({
    video: z.string().describe("YouTube video id or URL — only one you know exists."),
    title: z.string().optional().describe("Caption under the thumbnail."),
  }),
  description:
    "A YouTube video shown as its thumbnail with the link below; GPUI has no video player, so this is the poster plus the URL.",
  component: ({ props }) => {
    const t = useAdwaita();
    const id = videoId(props.video);
    if (!id) {
      return (
        <T size="caption" color={t.color.text.dim} style={{ width: "100%" }}>
          {"Not a YouTube link."}
        </T>
      );
    }
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: GAP.s,
          width: "100%",
        }}
      >
        <img
          src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
          alt={props.title ?? "YouTube video"}
          objectFit="cover"
          style={{ width: "100%", height: 220, borderRadius: t.radius.xs }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: GAP.s,
            alignItems: "center",
            width: "100%",
          }}
        >
          <AdwIcon name="play" size={16} color={t.color.functional.destructive} />
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
            {`https://youtu.be/${id}`}
          </T>
        </div>
        {props.title ? (
          <T size="body" color={t.color.text.primary} style={{ width: "100%" }}>
            {props.title}
          </T>
        ) : null}
      </div>
    );
  },
});

export const Celebration = defineComponent({
  name: "Celebration",
  props: z.object({
    when: z.boolean().describe("Show it when this condition is true, e.g. $done == 5."),
    title: z.string().optional().describe("Headline (default \"Done\")."),
    detail: z.string().optional().describe("One line about what happened."),
  }),
  description:
    "A success banner that appears when its condition turns true; nothing renders while it is false.",
  component: ({ props }) =>
    props.when ? (
      <Alert variant="success" style={{ width: "100%" }}>
        <AlertTitle>{props.title ?? "Done"}</AlertTitle>
        {props.detail ? <AlertDescription>{props.detail}</AlertDescription> : null}
      </Alert>
    ) : null,
});
