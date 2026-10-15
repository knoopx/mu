import {
  Icon,
  Skeleton,
  Spinner,
  T,
  rowHoverBg,
  useAdwaita,
  type AdwaitaTheme,
  type IconName,
} from "adwaita-gpuix";
import { useState, type JSX } from "react";
import type { StyleDesc } from "@gpuix/react";

import { mutedText } from "../../core/lib/ui/theme";
import { openExternal } from "../../../window/openLink";
import { SEARCH_TOOL_NAME } from "../constants";
import { type WebSearchDetails, WebSearchResult } from "../types";

import type { TranscriptItem } from "../../core/lib/agent/transcriptState";

export function isSearchTool(name: string): boolean {
  return name.toLowerCase() === SEARCH_TOOL_NAME;
}

export function searchDetailsOf(
  item: Extract<TranscriptItem, { kind: "tool" }>,
): WebSearchDetails | undefined {
  const details = item.details as WebSearchDetails | undefined;
  if (details === undefined || details === null || typeof details !== "object")
    return undefined;
  return Array.isArray(details.results) ? details : undefined;
}

function queryOf(item: Extract<TranscriptItem, { kind: "tool" }>): string {
  const args = item.args as { query?: unknown } | undefined;
  if (typeof args?.query === "string") return args.query.trim();
  return searchDetailsOf(item)?.query ?? "";
}

export function searchPreviewOf(
  item: Extract<TranscriptItem, { kind: "tool" }>,
): string {
  const query = queryOf(item);
  const details = searchDetailsOf(item);
  const count = details?.count ?? details?.results.length ?? 0;

  if (item.status === "running")
    return query === "" ? "searching" : `${query} · searching`;
  if (item.status === "error")
    return query === "" ? "search failed" : `${query} · failed`;
  if (details === undefined) return query;
  if (details.status === "no-results" || count === 0)
    return `${query} · no results`;
  return `${query} · ${count} ${count === 1 ? "result" : "results"}`;
}

function listColumn(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    paddingLeft: t.space.sm,
    paddingRight: t.space.sm,
    minWidth: 0,
    flexShrink: 1,
  };
}

function textRow(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.sm,
    paddingTop: t.space.xs,
    paddingBottom: t.space.xs,
    minWidth: 0,
    flexShrink: 0,
  };
}

function cellColumn(t: AdwaitaTheme, first: boolean): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    borderTopWidth: first ? 0 : t.control.dividerThickness,
    borderColor: t.color.divider.faint,
    minWidth: 0,
    flexShrink: 0,
  };
}

function rowShell(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: t.space.md,
    paddingTop: t.space.sm,
    paddingBottom: t.space.sm,
    marginLeft: -t.space.sm,
    marginRight: -t.space.sm,
    paddingLeft: t.space.sm,
    paddingRight: t.space.sm,
    minWidth: 0,
    flexShrink: 0,
  };
}

function skeletonRow(t: AdwaitaTheme): StyleDesc {
  return { ...rowShell(t), pointerEvents: "none" };
}

function resultRow(t: AdwaitaTheme): StyleDesc {
  return {
    ...rowShell(t),
    borderRadius: t.radius.sm,
    cursor: "pointer",
    hover: { backgroundColor: rowHoverBg(t) },
    active: { backgroundColor: t.color.surface.active },
  };
}

function rankColumn(t: AdwaitaTheme): StyleDesc {
  return {
    width: t.space.lg,
    flexShrink: 0,
    fontFamily: t.type.fontFamilyMono,
    pointerEvents: "none",
  };
}

function bodyColumn(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 0,
    pointerEvents: "none",
  };
}

function lineText(color: string): StyleDesc {
  return { flexShrink: 1, minWidth: 0, color };
}

function metaText(row: WebSearchResult): string {
  if (row.host === "") return row.snippet;
  return row.snippet === "" ? row.host : `${row.host} — ${row.snippet}`;
}

function ResultRow({
  row,
  first,
}: {
  row: WebSearchResult;
  first: boolean;
}): JSX.Element {
  const t = useAdwaita();
  const [failure, setFailure] = useState<string | undefined>(undefined);
  const title = row.title === "" ? row.host : row.title;

  const open = () =>
    openExternal(row.url).catch((error: unknown) =>
      setFailure(error instanceof Error ? error.message : String(error)),
    );

  return (
    <div style={cellColumn(t, first)}>
      <div style={resultRow(t)} onClick={open}>
        <T
          size="caption"
          color={mutedText(t)}
          align="right"
          style={rankColumn(t)}
        >
          {String(row.rank).padStart(2, "0")}
        </T>
        <div style={bodyColumn(t)}>
          <T size="list" weight={600} style={lineText(t.color.text.primary)}>
            {title}
          </T>
          <T
            size="caption"
            style={lineText(
              row.snippet === "" ? mutedText(t) : t.color.text.secondary,
            )}
          >
            {metaText(row)}
          </T>
        </div>
      </div>
      {failure === undefined ? null : (
        <div style={textRow(t)}>
          <T
            size="caption"
            color={t.color.functional.destructive}
            style={{ flexShrink: 1, minWidth: 0 }}
          >
            {failure}
          </T>
        </div>
      )}
    </div>
  );
}

function StateLine({
  icon,
  text,
  color,
}: {
  icon: IconName;
  text: string;
  color: string;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={textRow(t)}>
      <Icon
        name={icon}
        size={t.control.navIconSize}
        color={color}
        style={{ flexShrink: 0 }}
      />
      <T size="caption" color={color} style={{ minWidth: 0 }}>
        {text}
      </T>
    </div>
  );
}

function SummaryLine({ text }: { text: string }): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={textRow(t)}>
      <T
        size="caption"
        color={mutedText(t)}
        style={{ flexShrink: 1, minWidth: 0 }}
      >
        {text}
      </T>
    </div>
  );
}

function SearchSkeleton(): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={{ ...listColumn(t), paddingLeft: 0, paddingTop: t.space.xs }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={cellColumn(t, i === 0)}>
          <div style={skeletonRow(t)}>
            <Skeleton width={t.space.lg} height={t.type.caption} />
            <div style={bodyColumn(t)}>
              <Skeleton
                width={
                  i === 1
                    ? t.control.rowSliderWidth
                    : t.control.filterEntryWidth
                }
                height={t.type.list}
              />
              <Skeleton
                width={t.control.comboPillMaxWidth}
                height={t.type.caption}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export interface SearchResultsProps {
  item: Extract<TranscriptItem, { kind: "tool" }>;
}

export function SearchResults({ item }: SearchResultsProps): JSX.Element {
  const t = useAdwaita();
  const details = searchDetailsOf(item);
  const query = queryOf(item);

  if (item.status === "error") {
    const message = item.output.trim();
    return (
      <StateLine
        icon="cancel"
        color={t.color.functional.destructive}
        text={message === "" ? "Search failed" : message}
      />
    );
  }

  if (item.status === "running" && details === undefined) {
    return (
      <div style={listColumn(t)}>
        <div style={textRow(t)}>
          <Spinner size={16} color="accent" />
          <T size="caption" color={mutedText(t)} style={{ minWidth: 0 }}>
            {query === ""
              ? "Searching the web"
              : `Searching the web for “${query}”`}
          </T>
        </div>
        <SearchSkeleton />
      </div>
    );
  }

  const results = details?.results ?? [];
  if (results.length === 0) {
    return (
      <SummaryLine
        text={query === "" ? "No results" : `No results for “${query}”`}
      />
    );
  }

  return (
    <div style={listColumn(t)}>
      <SummaryLine
        text={`${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`}
      />
      {results.map((row, i) => (
        <ResultRow key={`${row.rank}-${row.url}`} row={row} first={i === 0} />
      ))}
    </div>
  );
}
