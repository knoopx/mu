/**
 * What the nine GitHub cards share.
 *
 * A band of the card, its prose and its code. That is all: the line naming the call,
 * its status and the record's figures belong to the tool header above the plate — as
 * its preview line and its chips — so a card never opens with a second heading and
 * never draws a band of counts above the content those counts describe. The plate
 * they stand on and the header over it are core's, because a card is a body, not a
 * row, so nothing here paints a box.
 */

import type { JSX } from "react";
import { useAdwaita } from "adwaita-gpuix";

import { Markdown } from "../../core/components/Markdown";
import {
  previewLineHeight,
  toolBand,
} from "../../core/lib/ui/transcriptLayout";
import { buildNativeTheme } from "../../core/lib/ui/theme";
import { HAIRLINE } from "../../core/lib/ui/tokens";
import { FILE_BODY_LINES } from "../lib/format";

/**
 * One band of a card, on the log's own plate.
 *
 * A section of an answer gets a card of its own: the files a pull request moved
 * end where its description starts, and the reader sees that boundary rather
 * than working it out from a wider gap in one continuous plate. The plate is the
 * log's one recipe (`toolBand`), so a card's sections and every other tool row
 * share a fill, a radius and a padding, and differ only in how many cards a row
 * answers with.
 */
export function Band({
  children,
  first = false,
}: {
  children: (JSX.Element | null)[] | JSX.Element | null;
  first?: boolean;
}): JSX.Element | null {
  const t = useAdwaita();
  const parts = (Array.isArray(children) ? children : [children]).filter(
    (part) => part !== null && part !== undefined,
  );
  if (parts.length === 0) return null;
  return (
    <div
      style={{
        ...toolBand(t),
        gap: t.space.sm,
        marginTop: first ? 0 : t.space.sm,
        flexShrink: 0,
      }}
    >
      {parts}
    </div>
  );
}

/** The record's own words: a description, a body, a message — markdown, held off the
 *  rule that marks it as quoted rather than as the log's own prose. */
export function Prose({ source }: { source: string }): JSX.Element | null {
  const t = useAdwaita();
  const text = source.trim();
  if (text === "") return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: t.space.md,
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      <div
        style={{
          width: HAIRLINE,
          backgroundColor: t.color.border.default,
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0, flexShrink: 1 }}>
        <Markdown source={text} />
      </div>
    </div>
  );
}

/**
 * The file's text, painted bare.
 *
 * A fenced block inside `<markdown>` brings its own card — a plate, a rule and a
 * language bar — and the answer already stands on the log's plate, so a file's text
 * goes to the native `<code>` element instead: no fill, no border, no radius, no
 * padding, no header, and the same tree-sitter highlight, read off the path. The
 * body is the file's head and says nothing about the rest of the file — the header
 * above the band is where the cut is spoken, once.
 */
export function Code({
  path,
  lines,
}: {
  path: string;
  lines: string[];
}): JSX.Element {
  const t = useAdwaita();
  const lineHeight = previewLineHeight(t);

  return (
    <code
      code={lines.join("\n")}
      path={path}
      theme={buildNativeTheme(t)}
      style={{
        maxHeight: FILE_BODY_LINES * lineHeight,
        overflow: "hidden",
        flexShrink: 0,
        minWidth: 0,
        fontSize: t.type.caption,
        lineHeight,
        fontFamily: t.type.fontFamilyMono,
        color: t.color.text.primary,
      }}
    />
  );
}
