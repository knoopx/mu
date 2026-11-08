import {
  Skeleton,
  Spinner,
  T,
  rowHoverBg,
  useAdwaita,
  type AdwaitaTheme,
} from "adwaita-gpuix";
import { useState, type JSX } from "react";
import type { StyleDesc } from "@gpuix/react";

import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import { ToolStateLine } from "../../core/components/ToolStateLine";
import { mutedText } from "../../core/lib/ui/theme";
import { STATE_GLYPH, emphasisWeight } from "../../core/lib/ui/tokens";
import {
  toolBodyColumn,
  toolCell,
  toolColumn,
  toolGrow,
  toolLine,
  toolMark,
  toolText,
} from "../../core/lib/ui/toolRows";
import { openExternal } from "../../../window/openLink";
import { SEARCH_TOOL_NAME } from "../constants";
import { type WebSearchDetails, WebSearchResult } from "../types";

import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";

export function isSearchTool(name: string): boolean {
  return name.toLowerCase() === SEARCH_TOOL_NAME;
}

export function searchDetailsOf(
  item: ToolTranscriptItem,
): WebSearchDetails | undefined {
  const details = item.details as WebSearchDetails | undefined;
  if (details === undefined || details === null || typeof details !== "object")
    return undefined;
  return Array.isArray(details.results) ? details : undefined;
}

function queryOf(item: ToolTranscriptItem): string {
  const args = item.args as { query?: unknown } | undefined;
  if (typeof args?.query === "string") return args.query.trim();
  return searchDetailsOf(item)?.query ?? "";
}

export function searchPreviewOf(item: ToolTranscriptItem): string {
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

function lineText(color: string): StyleDesc {
  return { ...toolGrow, color };
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
    <div style={toolCell(t, first)}>
      <div style={resultRow(t)} onClick={open}>
        <T
          size="caption"
          color={mutedText(t)}
          align="right"
          style={rankColumn(t)}
        >
          {String(row.rank).padStart(2, "0")}
        </T>
        <div style={toolBodyColumn}>
          <T
            size="list"
            weight={emphasisWeight(t)}
            style={lineText(t.color.text.primary)}
          >
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
        <div style={toolLine(t)}>
          <T
            size="caption"
            color={t.color.functional.destructive}
            style={toolGrow}
          >
            {failure}
          </T>
        </div>
      )}
    </div>
  );
}

function SearchSkeleton(): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={{ ...toolColumn(t), paddingTop: t.space.xs }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={toolCell(t, i === 0)}>
          <div style={skeletonRow(t)}>
            <Skeleton width={t.space.lg} height={t.type.caption} />
            <div style={toolBodyColumn}>
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
  item: ToolTranscriptItem;
}

export function SearchResults({ item }: SearchResultsProps): JSX.Element {
  const t = useAdwaita();
  const details = searchDetailsOf(item);
  const query = queryOf(item);

  if (item.status === "error") {
    const message = item.output.trim();
    return (
      <div style={toolColumn(t)}>
        <ToolStateLine
          icon="cancel"
          color={t.color.functional.destructive}
          text={message === "" ? "Search failed" : message}
        />
      </div>
    );
  }

  if (item.status === "running" && details === undefined) {
    return (
      <div style={toolColumn(t)}>
        <div style={toolLine(t)}>
          <Spinner size={STATE_GLYPH} color="accent" style={toolMark} />
          <T size="caption" color={mutedText(t)} style={toolText(t)}>
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
      <div style={toolColumn(t)}>
        <ToolCaptionLine
          color={mutedText(t)}
          text={query === "" ? "No results" : `No results for “${query}”`}
        />
      </div>
    );
  }

  return (
    <div style={toolColumn(t)}>
      <ToolCaptionLine
        color={mutedText(t)}
        text={`${results.length} ${results.length === 1 ? "result" : "results"} for “${query}”`}
      />
      {results.map((row, i) => (
        <ResultRow key={`${row.rank}-${row.url}`} row={row} first={i === 0} />
      ))}
    </div>
  );
}
