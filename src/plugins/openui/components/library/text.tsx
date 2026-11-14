/**
 * The text area of the language: what a program says, at the size and in the
 * colour word it asks for.
 *
 * A program never sets a font: `Title("…","lg")` is a `ProgramTextSize` and the
 * app's scale answers for it, and `tone: "muted"` is a word this library's
 * colour vocabulary turns into a theme colour.
 */

import type { JSX } from "react";
import { defineComponent, type ElementNode } from "@openuidev/lang-core";
import { Badge as AdwaitaBadge, T } from "adwaita-gpuix";
import { z } from "zod/v4";

import { HAIRLINE } from "../../../core/lib/ui/tokens";
import { mutedText } from "../../../core/lib/ui/theme";
import { innerGap } from "../../lib/tokens";
import {
  programBadgeVariant,
  programRule,
  programTextColor,
  toneOfValue,
  type ProgramTone,
} from "../../lib/theme";
import {
  programEmphasisWeight,
  programTextRole,
  programTitleWeight,
  type ProgramTextSize,
} from "../../lib/tokens";
import type { ProgramContext } from "./context";
import { ProgramText, listProp, prop, textProp } from "./context";
import { cellOf, isFigure, textCell } from "./rows";

const SIZE_WORD = z.enum(["sm", "md", "lg", "xl"]);

/** What a detail row calls its two cells. */
const DETAIL_NAMES = ["label", "value", "tone"] as const;

export const Title = defineComponent({
  name: "Title",
  description:
    "a heading: sm inside a Pane, lg or xl only for the screen itself",
  props: z.object({
    text: z.union([z.string(), z.number()]),
    size: SIZE_WORD.nullable().optional(),
  }),
  component: drawTitle,
});

export const Text = defineComponent({
  name: "Text",
  description: "a paragraph of the screen's prose",
  props: z.object({
    text: z.union([z.string(), z.number()]),
    size: SIZE_WORD.nullable().optional(),
    tone: z.string().nullable().optional(),
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
  description: "one fact, short: a state, a count, a category",
  props: z.object({
    text: z.union([z.string(), z.number()]),
    tone: z.string().nullable().optional(),
  }),
  component: drawBadge,
});

export const KeyValue = defineComponent({
  name: "KeyValue",
  description: "a label and its value on one line — the row of a detail list",
  props: z.object({
    label: z.union([z.string(), z.number()]),
    value: z.union([z.string(), z.number()]),
    tone: z.string().nullable().optional(),
  }),
  component: drawKeyValue,
});

export const Details = defineComponent({
  name: "Details",
  description:
    "a detail list: one labelled fact per row, its value on the right, a rule between them",
  props: z.object({
    rows: z.array(z.any()),
  }),
  component: drawDetails,
});

export const Note = defineComponent({
  name: "Note",
  description: "one line the app states about the screen itself",
  props: z.object({
    text: z.string(),
    tone: z.string().nullable().optional(),
  }),
  component: drawNote,
});

export const Code = defineComponent({
  name: "Code",
  description: "a block of monospace text the human may want to copy",
  props: z.object({
    text: z.string(),
  }),
  component: drawCode,
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
  const tone = prop<ProgramTone | null>(node.props, "tone", null);
  return (
    <T
      size={programTextRole(prop<ProgramTextSize>(node.props, "size", "md"))}
      weight={node.props.emphasise ? programEmphasisWeight(ctx.t) : undefined}
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
  const tone = prop<ProgramTone | null>(node.props, "tone", null);
  return (
    <AdwaitaBadge variant={programBadgeVariant(tone)} size="sm">
      {textProp(node.props, "text")}
    </AdwaitaBadge>
  );
}

export function drawKeyValue(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const tone = toneOfValue(node.props.tone);
  const value = textProp(node.props, "value");
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
      <ProgramText
        value={node.props.label}
        ctx={ctx}
        size="caption"
        color={mutedText(ctx.t)}
      />
      <div style={{ flexGrow: 1, minWidth: 0, minHeight: 1 }} />
      <ProgramText
        value={value}
        ctx={ctx}
        size="list"
        color={programTextColor(ctx.t, tone)}
        mono={isFigure(value)}
      />
    </div>
  );
}

/**
 * The rows of a detail list, joined by rules.
 *
 * `KeyValue` is one line; a screen's spec sheet is a list of them, and a list has
 * the one thing a loose stack of lines does not: the rule that says where each
 * fact ends. The label stands quiet on the left in mono and the value on the right
 * — mono when it is a figure, so a column of them lines up on its digits.
 */
export function drawDetails(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const rows = listProp(node.props, "rows");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
      }}
    >
      {rows.map((row, index) => {
        const label = textCell(row, DETAIL_NAMES, 0) ?? "";
        const value = textCell(row, DETAIL_NAMES, 1) ?? "";
        const tone = toneOfValue(cellOf(row, DETAIL_NAMES, 2));
        const figure = isFigure(value);
        const last = index === rows.length - 1;
        return (
          <div
            key={`d-${String(index)}`}
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

export function drawNote(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const tone = prop<ProgramTone | null>(node.props, "tone", null);
  return (
    <T
      size="caption"
      color={programTextColor(ctx.t, tone === null ? "muted" : tone)}
      clamp={4}
      style={{ flexShrink: 1, minWidth: 0 }}
    >
      {textProp(node.props, "text")}
    </T>
  );
}

export function drawCode(node: ElementNode, ctx: ProgramContext): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        minWidth: 0,
        padding: innerGap(ctx.t),
        borderRadius: ctx.t.radius.sm,
        backgroundColor: ctx.t.color.surface.sunken,
      }}
    >
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
        {textProp(node.props, "text")}
      </T>
    </div>
  );
}
