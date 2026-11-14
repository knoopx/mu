/**
 * `web-fetch`: a page, read.
 *
 * The URL is a row of its own and opens in the desktop's browser, because a page
 * read is often the start of a human wanting to look at the same page. Its figures
 * say how big the page was and whether the answer was cut; the body is the page's
 * own opening lines, one row each, and one quiet line for what the log left out.
 * The model was given the whole opening — the log quotes enough to show what came
 * back, not all of it.
 */

import { Skeleton, T, rowHoverBg, useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import { useState, type JSX } from "react";
import type { StyleDesc } from "@gpuix/react";

import { StateSpinner } from "../../core/components/StateSpinner";
import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import { ToolStateLine } from "../../core/components/ToolStateLine";
import { counted, moreLine, partsLine } from "../../core/lib/agent/toolText";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { mutedText } from "../../core/lib/ui/theme";
import { ROW_HEIGHT, emphasisWeight } from "../../core/lib/ui/tokens";
import {
  toolColumn,
  toolLine,
  toolMark,
  toolOneLine,
  toolText,
} from "../../core/lib/ui/toolRows";
import { openExternal } from "../../../window/openLink";
import { hostOf } from "../../../utils/urlText";
import { FETCH_TOOL_NAME, MAX_PAGE_CHARS } from "../constants";
import type { WebFetchDetails } from "../types";

export function isFetchTool(name: string): boolean {
  return name.toLowerCase() === FETCH_TOOL_NAME;
}

export function fetchDetailsOf(
  item: ToolTranscriptItem,
): WebFetchDetails | undefined {
  const details = item.details as WebFetchDetails | undefined;
  if (details === undefined || details === null || typeof details !== "object")
    return undefined;
  return typeof details.url === "string" ? details : undefined;
}

function urlOf(item: ToolTranscriptItem): string {
  const args = item.args as { url?: unknown } | undefined;
  if (typeof args?.url === "string") return args.url.trim();
  return fetchDetailsOf(item)?.url ?? "";
}

function hostLabel(item: ToolTranscriptItem): string {
  return fetchDetailsOf(item)?.host || hostOf(urlOf(item));
}

export function fetchPreviewOf(item: ToolTranscriptItem): string {
  const host = hostLabel(item);
  const details = fetchDetailsOf(item);

  if (item.status === "running")
    return host === "" ? "reading a page" : `reading ${host}`;
  if (item.status === "error")
    return host === "" ? "page read failed" : `${host} · failed`;
  if (details === undefined) return host;
  if (details.status === "empty") return `${host} · no text`;
  // The header names the source and says whether it was a cache hit; the figures
  // belong to the row under it, which is the one that says how much of the page
  // is on screen.
  return partsLine(host, details.cached ? "cached" : "");
}

function figuresOf(details: WebFetchDetails): string {
  return partsLine(
    counted(details.chars, "character"),
    counted(details.lines, "line"),
    details.truncated ? `first ${String(MAX_PAGE_CHARS)} shown` : "",
    details.cached ? "from cache" : "",
  );
}

/** The URL row is one line of the log and a hover band wide enough to click. */
function sourceRow(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: t.space.md,
    minHeight: ROW_HEIGHT,
    marginLeft: -t.space.sm,
    marginRight: -t.space.sm,
    paddingLeft: t.space.sm,
    paddingRight: t.space.sm,
    borderRadius: t.radius.sm,
    cursor: "pointer",
    minWidth: 0,
    flexShrink: 0,
    hover: { backgroundColor: rowHoverBg(t) },
    active: { backgroundColor: t.color.surface.active },
  };
}

function PageSkeleton(): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={{ ...toolColumn(t), pointerEvents: "none" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={toolLine(t)}>
          <Skeleton
            width={i === 0 ? t.control.rowSliderWidth : t.control.filterEntryWidth}
            height={t.type.caption}
          />
        </div>
      ))}
    </div>
  );
}

export interface FetchedPageProps {
  item: ToolTranscriptItem;
}

export function FetchedPage({ item }: FetchedPageProps): JSX.Element {
  const t = useAdwaita();
  const details = fetchDetailsOf(item);
  const url = urlOf(item);
  const host = hostLabel(item);
  const [failure, setFailure] = useState<string | undefined>(undefined);

  const open = (): void => {
    openExternal(url).catch((error: unknown) =>
      setFailure(error instanceof Error ? error.message : String(error)),
    );
  };

  if (item.status === "error") {
    const message = item.output.trim();
    return (
      <div style={toolColumn(t)}>
        <ToolStateLine
          icon="cancel"
          color={t.color.functional.destructive}
          text={message === "" ? "The page could not be read" : message}
        />
      </div>
    );
  }

  if (item.status === "running" && details === undefined) {
    return (
      <div style={toolColumn(t)}>
        <div style={toolLine(t)}>
          <StateSpinner style={toolMark} />
          <T size="caption" color={mutedText(t)} style={toolText(t)}>
            {host === "" ? "Reading a page" : `Reading ${host}`}
          </T>
        </div>
        <PageSkeleton />
      </div>
    );
  }

  if (details === undefined) {
    return (
      <div style={toolColumn(t)}>
        <ToolCaptionLine color={mutedText(t)} text={url} />
      </div>
    );
  }

  if (details.status === "empty") {
    return (
      <div style={toolColumn(t)}>
        <ToolCaptionLine
          color={mutedText(t)}
          text={`No text came back from ${details.host}`}
        />
      </div>
    );
  }

  const omitted = details.lines - details.excerpt.length;

  return (
    <div style={toolColumn(t)}>
      <div style={sourceRow(t)} onClick={open}>
        <T
          size="caption"
          weight={emphasisWeight(t)}
          color={t.color.text.primary}
          style={toolOneLine}
        >
          {details.url}
        </T>
        <T size="caption" color={mutedText(t)} style={toolText(t)}>
          {figuresOf(details)}
        </T>
      </div>
      {details.excerpt.map((line, i) => (
        <div key={`${i}-${line.slice(0, 24)}`} style={toolLine(t)}>
          <T
            size="caption"
            color={t.color.text.secondary}
            style={toolOneLine}
          >
            {line}
          </T>
        </div>
      ))}
      {omitted > 0 ? (
        <ToolCaptionLine
          color={mutedText(t)}
          text={moreLine(omitted, "line")}
        />
      ) : null}
      {failure === undefined ? null : (
        <div style={toolLine(t)}>
          <T
            size="caption"
            color={t.color.functional.destructive}
            style={toolText(t)}
          >
            {failure}
          </T>
        </div>
      )}
    </div>
  );
}
