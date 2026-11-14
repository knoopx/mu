/**
 * `web-fetch`: a page, read.
 *
 * One header, then the page. The header names the source and carries the figures —
 * how big the page was, how much of it the log quotes, whether the answer came from
 * the cache — so no figure is repeated under it and the body keeps no tally of its
 * own. The URL stays a row of its own only because it does a thing a header cannot:
 * it opens in the desktop's browser, and a page read is often the start of a human
 * wanting to look at the same page. The body is the page's opening lines, one row
 * each. The model was given the whole opening — the log quotes enough to show what
 * came back, not all of it.
 */

import {
  Skeleton,
  T,
  rowHoverBg,
  useAdwaita,
  type AdwaitaTheme,
} from "adwaita-gpuix";
import { useState, type JSX } from "react";
import type { StyleDesc } from "@gpuix/react";

import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import {
  ToolFailedBody,
  ToolRunningBody,
} from "../../core/components/ToolStateBody";
import { headerLineOf } from "../../core/lib/agent/toolPreview";
import { counted, moreLine, partsLine } from "../../core/lib/agent/toolText";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { mutedText } from "../../core/lib/ui/theme";
import { ROW_HEIGHT, emphasisWeight } from "../../core/lib/ui/tokens";
import {
  toolColumn,
  toolLine,
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

function fetchDetailsOf(item: ToolTranscriptItem): WebFetchDetails | undefined {
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
  // One header: the source, and along it how big the page was, how much of it the
  // log quotes, and whether the answer came out of the cache. Nothing under here
  // repeats a figure, and the body keeps no tally of its own.
  const omitted = details.lines - details.excerpt.length;
  return headerLineOf(host, [
    figuresOf(details),
    omitted > 0 ? moreLine(omitted, "line") : "",
  ]);
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
            width={
              i === 0 ? t.control.rowSliderWidth : t.control.filterEntryWidth
            }
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

export function FetchedPage({ item }: FetchedPageProps): JSX.Element | null {
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
      <ToolFailedBody
        text={message === "" ? "The page could not be read" : message}
      />
    );
  }

  if (item.status === "running" && details === undefined) {
    return (
      <ToolRunningBody
        text={host === "" ? "Reading a page" : `Reading ${host}`}
      >
        <PageSkeleton />
      </ToolRunningBody>
    );
  }

  if (details === undefined) {
    return (
      <div style={toolColumn(t)}>
        <ToolCaptionLine color={mutedText(t)} text={url} />
      </div>
    );
  }

  // A page that gave back no text is said once, on the header (`host · no text`):
  // the card holds the page, and there is no page.
  if (details.status === "empty") return null;

  return (
    <div style={toolColumn(t)}>
      {/* The URL, and nothing beside it: the figures it used to trail are on the
          header, and this row exists because it opens in the browser. */}
      <div style={sourceRow(t)} onClick={open}>
        <T
          size="caption"
          weight={emphasisWeight(t)}
          color={t.color.text.primary}
          style={toolOneLine}
        >
          {details.url}
        </T>
      </div>
      {details.excerpt.map((line, i) => (
        <div key={`${i}-${line.slice(0, 24)}`} style={toolLine(t)}>
          <T size="caption" color={t.color.text.secondary} style={toolOneLine}>
            {line}
          </T>
        </div>
      ))}
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
