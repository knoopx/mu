

/**
 * What the nine GitHub cards share.
 *
 * A band of the card, the line that opens it (the record's name, what identifies
 * it, whose face stands at its head, where it stands), its figures, its prose and
 * its code. The plate they stand on and the header above them are core's — a card
 * is a body, not a row — so nothing here paints a box.
 */

import type { JSX } from "react";
import { Avatar, Icon, T, useAdwaita, type IconName } from "adwaita-gpuix";

import { Markdown } from "../../core/components/Markdown";
import {
  MAX_OUTPUT_LINES,
  plainOutputOf,
} from "../../core/lib/ui/toolOutputMode";
import { mutedText } from "../../core/lib/ui/theme";
import { HAIRLINE, MARKER_GLYPH, titleWeight } from "../../core/lib/ui/tokens";
import type {
  GithubFact,
  GithubState,
} from "../lib/kinds/contract";


const MARK_BOX = 24;


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
 * The file's text, quoted bare.
 *
 * The whole answer already stands on the log's band, and a plate inside a band is
 * a card inside a card, so the code carries no fill of its own — only the fence,
 * which is what lets the same highlighter read it that paints a diff row.
 */
function CodeLines({
  path,
  content,
}: {
  path: string;
  content: string;
}): JSX.Element {
  const fence = /([A-Za-z0-9]+)$/.exec(path.split("/").pop() ?? "")?.[1] ?? "";
  return (
    <Markdown
      source={["```" + fence.toLowerCase(), content, "```"].join("\n")}
      style={{ padding: 0, flexShrink: 0, minWidth: 0 }}
    />
  );
}
