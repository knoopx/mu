/**
 * The screen's own chrome: the header a program opens with and the status line
 * it closes with. These are the two parts of a mu screen that are never a card,
 * and they are the reason `Screen` exists as a root rather than a bare `Stack`.
 */

import type { JSX } from "react";
import { defineComponent, type ElementNode } from "@openuidev/lang-core";
import { T } from "adwaita-gpuix";
import { z } from "zod/v4";

import { HAIRLINE } from "../../../core/lib/ui/tokens";
import { mutedText } from "../../../core/lib/ui/theme";
import { groupGap, innerGap, programTitleWeight } from "../../lib/tokens";
import type { ProgramContext } from "./context";
import { ProgramText, listProp, textProp } from "./context";

export const Header = defineComponent({
  name: "Header",
  description:
    "the screen's header bar: a title, one line of subtitle, and the few facts that frame it",
  props: z.object({
    title: z.string(),
    subtitle: z.string().nullable().optional(),
    chips: z.array(z.any()).optional(),
  }),
  component: drawHeader,
});

export const StatusLine = defineComponent({
  name: "StatusLine",
  description:
    "the inert line at the foot of a screen: what the page currently holds, in words",
  props: z.object({
    items: z.array(z.any()),
  }),
  component: drawStatusLine,
});

function drawHeader(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const title = textProp(node.props, "title");
  const subtitle = textProp(node.props, "subtitle");
  const chips = listProp(node.props, "chips");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: "100%",
          minWidth: 0,
          gap: groupGap(ctx.t),
        }}
      >
        <T
          size="title2"
          weight={programTitleWeight(ctx.t)}
          color={ctx.t.color.text.primary}
          clamp={2}
          style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
        >
          {title}
        </T>
      </div>
      {subtitle === "" ? null : (
        <T
          size="body"
          color={mutedText(ctx.t)}
          clamp={3}
          style={{ flexShrink: 1, minWidth: 0 }}
        >
          {subtitle}
        </T>
      )}
      {chips.length === 0 ? null : (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            width: "100%",
            minWidth: 0,
            gap: innerGap(ctx.t),
          }}
        >
          {ctx.nodes(chips)}
        </div>
      )}
      <div
        style={{
          width: "100%",
          height: HAIRLINE,
          flexShrink: 0,
          backgroundColor: ctx.t.color.divider.default,
          marginTop: innerGap(ctx.t),
        }}
      />
    </div>
  );
}

function drawStatusLine(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const items = listProp(node.props, "items");
  if (items.length === 0)
    return <ProgramText value="" ctx={ctx} size="caption" />;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        minWidth: 0,
        flexWrap: "wrap",
        gap: groupGap(ctx.t),
      }}
    >
      {ctx.nodes(items)}
    </div>
  );
}
