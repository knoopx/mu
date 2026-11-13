/**
 * Search hits, drawn as what each hit is.
 *
 * A search answers with five different things, and the mark on the left of a hit is
 * the whole difference: a repository is a repository, a code hit is a path in
 * somebody's repository, a user hit is a person, a commit hit is a sha and a
 * subject. One table with generic columns cannot say that; a row whose mark says
 * what it is can.
 *
 * Every hit is one line of text with the figures of its kind on the right edge, in
 * one column and one format, and a hairline between hits. They sit inside the call's
 * card, so they draw no box of their own — a row inside a card inside a card is how
 * a list stops looking like a list.
 */

import type { JSX } from "react";
import { Icon, T, useAdwaita, type IconName } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import {
  HAIRLINE,
  MARKER_GLYPH,
  monoTextWidth,
  titleWeight,
} from "../../core/lib/ui/tokens";
import { mutedText } from "../../core/lib/ui/theme";
import {
  toolBodyColumn,
  toolMonoOneLine,
  toolOneLine,
} from "../../core/lib/ui/toolRows";
import { humanCount } from "../lib/format";
import type { GithubCall, GithubRow } from "../types";

/** The mark a hit of each kind wears. */
const MARK_OF_KIND: Readonly<Record<string, IconName>> = {
  repositories: "code",
  code: "description",
  issues: "forum",
  commits: "commit",
  users: "person",
};

interface Hit {
  title: string;
  subtitle: string;
  mark: IconName;
  /** the count this kind is known by, already in the log's one number format */
  figure: string;
  /** what that count counts, and any word the kind adds under it */
  unit: string;
  caption: string;
}

/** One hit, read off the kind the search asked for — never guessed from its shape. */
function hitOf(kind: string, row: GithubRow): Hit {
  if (kind === "code")
    return {
      title: row.name,
      subtitle: row.detail,
      mark: "description",
      figure: "",
      unit: "",
      caption: "",
    };
  if (kind === "issues")
    return {
      title: row.name,
      subtitle: row.detail,
      mark: row.state === "closed" ? "block" : "forum",
      figure: row.figure,
      unit: "replies",
      caption: "",
    };
  if (kind === "commits")
    return {
      title: row.detail === "" ? row.name : row.detail,
      subtitle: row.state === "" ? row.name : `${row.name} in ${row.state}`,
      mark: "commit",
      figure: "",
      unit: "",
      caption: "",
    };
  if (kind === "users")
    return {
      title: row.name,
      subtitle: row.detail,
      mark: "person",
      figure: row.figure,
      unit: "repositories",
      caption: row.state,
    };
  // A repository hit is measured by one thing — stars — and that is all the right
  // edge says. The language it is written in belongs to the record a reader opens,
  // not to the line that lists it.
  return {
    title: row.name,
    subtitle: row.detail,
    mark: MARK_OF_KIND[kind] ?? "code",
    figure: row.figure,
    unit: "stars",
    caption: "",
  };
}

const hitRow = (t: ReturnType<typeof useAdwaita>): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: t.space.md,
  minWidth: 0,
  flexShrink: 0,
});

/**
 * The hit list. A hit's own name leads in the row's size and one step of weight, its
 * detail (the description, the repository, the bio) sits under it a step down and
 * muted, and what its kind is measured by stands on the right edge in mono.
 */
export function Hits({ call }: { call: GithubCall }): JSX.Element | null {
  const t = useAdwaita();
  if (call.rows.length === 0) return null;

  const hits = call.rows.map((row) => hitOf(call.target, row));
  const widest = hits.reduce(
    (wide, hit) =>
      Math.max(
        wide,
        hit.figure === "" ? 0 : hit.figure.length + hit.unit.length + 2,
      ),
    0,
  );
  const column = monoTextWidth(t, Math.max(widest, 6));

  return (
    <div style={{ ...toolBodyColumn, gap: 0, minWidth: 0 }}>
      {hits.map((hit, index) => (
        <div
          key={`${hit.title}-${String(index)}`}
          style={{
            paddingTop: t.space.sm,
            paddingBottom: t.space.sm,
            borderTopWidth: index === 0 ? 0 : HAIRLINE,
            borderColor: t.color.divider.default,
            minWidth: 0,
            flexShrink: 0,
          }}
        >
          <div style={hitRow(t)}>
            <Icon
              name={hit.mark}
              size={MARKER_GLYPH}
              color={mutedText(t)}
              style={{ flexShrink: 0 }}
            />
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
                size="list"
                weight={titleWeight(t)}
                color={t.color.text.primary}
                style={toolOneLine}
              >
                {hit.title}
              </T>
              {hit.subtitle === "" ? null : (
                <T
                  size="caption"
                  color={mutedText(t)}
                  style={toolMonoOneLine(t)}
                >
                  {hit.subtitle}
                </T>
              )}
            </div>
            <div style={{ flexGrow: 1, minWidth: t.space.sm }} />
            {hit.figure === "" && hit.caption === "" ? null : (
              // What the kind is measured by, against the right edge: the figure in
              // mono with the word for it beside it, and the one quality that names
              // the hit (its language, its type) on the line above.
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  gap: 2,
                  minWidth: column,
                  flexShrink: 0,
                }}
              >
                {hit.caption === "" ? null : (
                  <T
                    size="caption"
                    color={mutedText(t)}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {hit.caption}
                  </T>
                )}
                {hit.figure === "" ? null : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "baseline",
                      gap: t.space.xs,
                    }}
                  >
                    <T
                      size="list"
                      color={t.color.text.primary}
                      style={{
                        fontFamily: t.type.fontFamilyMono,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {humanCount(hit.figure)}
                    </T>
                    <T
                      size="micro"
                      color={mutedText(t)}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      {hit.unit}
                    </T>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
