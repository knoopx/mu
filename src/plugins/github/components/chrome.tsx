/**
 * The layout a GitHub row is built out of.
 *
 * A GitHub call owns its whole row — there is no shared tool box around it — so
 * these are the parts every one of the nine cards is assembled from, in the order a
 * record is read: **who or what it is** (a mark or an avatar, the name GitHub gave
 * the thing, and where it stands on the far side of the same line), **what it is
 * worth** (its counts, each one a figure with the word under it, not a mark beside
 * it), **the thing itself** (the tree, the change rows, the thread, the code), and
 * **what someone wrote about it** last, because a description is commentary on the
 * facts above it.
 *
 * Grouping is carried by space: 8 between the parts of one band, 24 between bands.
 * Every value arriving here has been through `lib/format.ts`, so a date reads as
 * `6 Nov`, a count as `812` or `47k`, and nothing on screen is the wire's text.
 */

import type { JSX } from "react";
import { Avatar, Icon, T, useAdwaita, type IconName } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { Markdown } from "../../core/components/Markdown";
import {
  MAX_OUTPUT_LINES,
  plainOutputOf,
} from "../../core/lib/ui/toolOutputMode";
import { mutedText } from "../../core/lib/ui/theme";
import {
  HAIRLINE,
  MARKER_GLYPH,
  monoColumn,
  titleWeight,
} from "../../core/lib/ui/tokens";
import { outputPanel, PAGE_INSET } from "../../core/lib/ui/transcriptLayout";
import type { GithubState } from "../lib/kinds/contract";

/** The band a mark or an avatar stands in, so the names of nine kinds start at one column. */
const MARK_BOX = 24;

/** One cell of a record's counts: the figure, and the word for it underneath. */
export interface GithubFact {
  label: string;
  value: string;
  /** the figure is painted in mono and holds one format, because it is a number */
  figure?: boolean;
  /** the tone a figure is read in, when the number itself is news */
  tone?: "good" | "bad" | "warn";
}

/** The page a GitHub row stands on: the log's own inset, and nothing else. */
export const rowPage = (): StyleDesc => ({
  paddingLeft: PAGE_INSET,
  paddingRight: PAGE_INSET,
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
  minWidth: 0,
});

/**
 * The plate a call's whole answer stands on.
 *
 * A tool's output sits on a band a step darker than the log, the same plate a file
 * read stands in: the log is the reading surface, and what a call brought back is a
 * thing laid on it, with its own edges. Every card is one plate — the identity, the
 * counts, the widget and the prose are its parts, not plates of their own.
 */
export function Card({
  children,
}: {
  children: (JSX.Element | null)[] | JSX.Element | null;
}): JSX.Element | null {
  const t = useAdwaita();
  const parts = (Array.isArray(children) ? children : [children]).filter(
    (part) => part !== null && part !== undefined,
  );
  if (parts.length === 0) return null;

  return (
    <div
      style={{
        ...outputPanel(t),
        padding: t.space.md,
        gap: 0,
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      {parts}
    </div>
  );
}

/** A band of the row, with the air that separates one band from the next. */
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
        display: "flex",
        flexDirection: "column",
        gap: t.space.sm,
        marginTop: first ? 0 : t.space.xl,
        flexShrink: 0,
        minWidth: 0,
      }}
    >
      {parts}
    </div>
  );
}

const stateColor = (
  t: ReturnType<typeof useAdwaita>,
  tone: GithubState["tone"],
): string => {
  if (tone === "good") return t.color.functional.success;
  if (tone === "bad") return t.color.functional.destructive;
  if (tone === "warn") return t.color.functional.warning;
  return mutedText(t);
};

/**
 * Who or what the row is about: a mark or the person's own face, the name GitHub
 * gives the thing, and where it stands on the far side of that same line. The state
 * is one word in the colour that word is read in — never a pill, and never said
 * again below.
 */
export function Identity({
  title,
  secondary = "",
  state,
  icon,
  person = "",
}: {
  title: string;
  secondary?: string;
  state?: GithubState | null;
  icon?: IconName;
  person?: string;
}): JSX.Element | null {
  const t = useAdwaita();
  if (
    title === "" &&
    secondary === "" &&
    (state === null || state === undefined)
  )
    return null;

  const named = title !== "" ? title : secondary;
  const rest = title !== "" ? secondary : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: t.space.sm,
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      {person !== "" ? (
        <Avatar
          name={person}
          size={MARK_BOX}
          icon="person"
          style={{ flexShrink: 0 }}
        />
      ) : icon !== undefined ? (
        <div
          style={{
            width: MARK_BOX,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={MARKER_GLYPH} color={mutedText(t)} />
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          minWidth: 0,
          flexShrink: 1,
        }}
      >
        <T
          size="body"
          weight={titleWeight(t)}
          color={t.color.text.primary}
          style={{
            minWidth: 0,
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {named}
        </T>
        {rest === "" ? null : (
          <T
            size="caption"
            color={mutedText(t)}
            style={{
              minWidth: 0,
              fontFamily: t.type.fontFamilyMono,
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
            }}
          >
            {rest}
          </T>
        )}
      </div>
      <div style={{ flexGrow: 1, minWidth: t.space.sm }} />
      {state === null || state === undefined || state.word === "" ? null : (
        <T
          size="caption"
          color={stateColor(t, state.tone)}
          style={{ whiteSpace: "nowrap", flexShrink: 0 }}
        >
          {state.word}
        </T>
      )}
    </div>
  );
}

/**
 * What the record is worth: its counts, each one a figure with the word for it
 * underneath. A label above a number makes the label the thing the eye lands on;
 * the count is the fact, so the count stands in the row's own size and the word
 * sits under it, one step down and muted. Numbers hold one format and a fixed
 * column, so three rows of the same kind can be read down the page.
 */
export function Facts({ facts }: { facts: GithubFact[] }): JSX.Element | null {
  const t = useAdwaita();
  const shown = facts.filter((fact) => fact.value !== "");
  if (shown.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        columnGap: t.space.xl,
        rowGap: t.space.md,
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      {shown.map((fact) => (
        <div
          key={fact.label}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            minWidth: 0,
          }}
        >
          <T
            size="list"
            color={
              fact.tone === undefined
                ? t.color.text.primary
                : stateColor(t, fact.tone)
            }
            style={
              fact.figure
                ? {
                    fontFamily: t.type.fontFamilyMono,
                    whiteSpace: "nowrap",
                  }
                : { whiteSpace: "nowrap", textOverflow: "ellipsis" }
            }
          >
            {fact.value}
          </T>
          <T
            size="caption"
            color={mutedText(t)}
            style={{ whiteSpace: "nowrap" }}
          >
            {fact.label}
          </T>
        </div>
      ))}
    </div>
  );
}

/**
 * What a call says when it has no card to show: that it is still going, that GitHub
 * refused it, that the path is bytes rather than text. The mark stands in the same
 * box an identity's mark stands in, so the line starts where every other card's
 * name starts.
 */
export function Standing({
  icon,
  text,
  tone = "plain",
  trailing,
}: {
  icon: IconName;
  text: string;
  tone?: "good" | "bad" | "warn" | "plain";
  trailing?: JSX.Element;
}): JSX.Element | null {
  const t = useAdwaita();
  if (text === "") return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: t.space.sm,
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: MARK_BOX,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={MARKER_GLYPH} color={stateColor(t, tone)} />
      </div>
      <T
        size="body"
        color={tone === "plain" ? t.color.text.secondary : stateColor(t, tone)}
        style={{ minWidth: 0, whiteSpace: "normal" }}
      >
        {text}
      </T>
      {trailing === undefined ? null : trailing}
    </div>
  );
}

/** A rule between two parts of one band — the log's own hairline, never a faint one. */
export function Rule(): JSX.Element {
  const t = useAdwaita();
  return (
    <div
      style={{
        height: HAIRLINE,
        backgroundColor: t.color.divider.default,
        flexShrink: 0,
      }}
    />
  );
}

/**
 * What someone wrote: a description, an issue's body, a commit's message. It stands
 * on the card's own plate, inset a step from its edge so a block of prose reads as
 * the card speaking rather than as a second panel laid over it.
 */
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
 * A file's text. The path and what the read carried are the card's identity band,
 * so the panel is only the text; where it stops short, one quiet line under it says
 * how much of the file is on screen.
 */
export function Code({
  path,
  content,
  total,
}: {
  path: string;
  content: string;
  total: number;
}): JSX.Element | null {
  const t = useAdwaita();
  const lines = content.replace(/\s+$/u, "").split("\n");
  if (lines.length === 0 || (lines.length === 1 && lines[0] === ""))
    return null;
  const kept = plainOutputOf(lines.join("\n"), MAX_OUTPUT_LINES, "head");
  const keptCount = kept.split("\n").length;
  const cut = Math.max(0, total - keptCount);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: t.space.sm,
        minWidth: 0,
        flexShrink: 0,
      }}
    >
      <CodeLines path={path} content={kept} />
      {cut === 0 ? null : (
        <T size="caption" color={mutedText(t)}>
          {`${String(keptCount)} of ${String(total)} lines`}
        </T>
      )}
    </div>
  );
}

/**
 * The text itself, through the log's markdown element: a fenced block is what the
 * app's syntax pass already reads, so a file painted here is highlighted the same
 * way a diff row is.
 */
function CodeLines({
  path,
  content,
}: {
  path: string;
  content: string;
}): JSX.Element {
  const t = useAdwaita();
  const fence = /([A-Za-z0-9]+)$/.exec(path.split("/").pop() ?? "")?.[1] ?? "";
  return (
    <Markdown
      source={["```" + fence.toLowerCase(), content, "```"].join("\n")}
      style={{ ...outputPanel(t), flexShrink: 0 }}
    />
  );
}
