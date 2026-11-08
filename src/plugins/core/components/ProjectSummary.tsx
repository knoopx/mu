import { useMemo, type JSX, type ReactNode } from "react";
import {
  BookmarkPill,
  Button,
  ContributionHeatmap,
  formatCount,
  GraphGutter,
  humanizeAgo,
  Icon,
  languageColor,
  ListRow,
  PillGroup,
  RowShell,
  Sparkline,
  T,
  tsToMs,
  useAdwaita,
  generateGraphData,
  graphLaneCount,
  type AdwaitaTheme,
  type GraphNode,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { PAGE_INSET } from "../lib/ui/transcriptLayout";
import { centerRow, column, ellipsis, ellipsisFill } from "../lib/ui/layout";
import { mutedText } from "../lib/ui/theme";
import {
  INLINE_GLYPH,
  MARKER_GLYPH,
  ROW_HEIGHT,
  STATE_GLYPH,
  STATUS_DOT,
  STATUS_DOT_RADIUS,
  glyphForText,
  lineBox,
  monoColumn,
  titleWeight,
} from "../lib/ui/tokens";
import {
  FEED_COUNT,
  type FeedChange,
  type ProjectSummaryModel,
} from "../lib/project/projectSummary";
import type { PromptPill } from "../lib/project/promptTemplates";
import { hasNoDescription } from "../../vcs/constants";

/** How many characters a project feed's own two fixed columns hold — the feed's
 *  id and age, not the log's id column, which `tokens.ts` sizes for itself. */
const FEED_ID_CHARS = 6;
const FEED_AGE_CHARS = 7;

/** The lines a loading header stands in for, in characters: a short title and two meta lines. */
const SKELETON_TITLE_CHARS = 18;
const SKELETON_META_CHARS = [38, 26] as const;

const FEED_LIMIT = FEED_COUNT;

export interface ProjectSummaryProps {
  model: ProjectSummaryModel | null;

  error?: string | null;

  onPrompt?: (prompt: string) => void;

  onReload?: () => void;

  pills?: PromptPill[];
}

function ChangeFeedRow(props: {
  feed: FeedChange;
  node: GraphNode;
  prev: GraphNode | null;
  laneCount: number;
  onPick?: () => void;
}): JSX.Element {
  const t = useAdwaita();
  const { change, bookmarks } = props.feed;
  const descColor = hasNoDescription(change.description)
    ? mutedText(t)
    : t.color.text.primary;
  return (
    <ListRow
      height={ROW_HEIGHT}
      onClick={props.onPick}
      style={{ paddingLeft: 0, paddingRight: 0 }}
    >
      <RowShell>
        <GraphGutter
          node={props.node}
          prev={props.prev}
          laneCount={props.laneCount}
          selected={false}
        />
        <div
          style={{
            width: monoColumn(t, FEED_ID_CHARS),
            flexShrink: 0,
            fontFamily: t.type.fontFamilyMono,
            fontSize: t.type.micro,
            color: mutedText(t),
            whiteSpace: "nowrap",
          }}
        >
          {change.change_id.slice(0, 8)}
        </div>
        {bookmarks.length > 0 ? (
          <PillGroup
            names={[...bookmarks.slice(0, 3)]}
            renderPill={(name, dimmed) => (
              <BookmarkPill name={name} dimmed={dimmed} />
            )}
          />
        ) : null}
        <T size="caption" color={descColor} style={ellipsisFill()}>
          {change.description}
        </T>
        {change.has_conflicts ? (
          <Icon
            name="warning"
            size={MARKER_GLYPH}
            color={t.color.functional.destructive}
            style={{ flexShrink: 0 }}
          />
        ) : null}
        <div
          style={{
            width: monoColumn(t, FEED_AGE_CHARS),
            flexShrink: 0,
            textAlign: "right",
            fontSize: t.type.micro,
            color: mutedText(t),
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          {humanizeAgo(tsToMs(change.timestamp))}
        </div>
      </RowShell>
    </ListRow>
  );
}

function Block(props: {
  children: ReactNode;
  inset: number;
  gap?: number;
  style?: Partial<StyleDesc>;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <div
      style={column(props.gap ?? t.space.sm, {
        width: "100%",
        flexShrink: 0,
        paddingLeft: props.inset,
        paddingRight: props.inset,
        ...props.style,
      })}
    >
      {props.children}
    </div>
  );
}

function SectionTitle(props: {
  title: string;
  trailing?: string;
  inset: number;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <Block
      inset={props.inset}
      gap={t.space.xs}
      style={{ paddingTop: t.space.sm, paddingBottom: t.space.xs }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "baseline",
          gap: t.space.sm,
        }}
      >
        <T
          size="title4"
          weight={titleWeight(t)}
          color={t.color.text.primary}
        >
          {props.title}
        </T>
        {props.trailing !== undefined ? (
          <T
            size="caption"
            color={mutedText(t)}
            style={{ whiteSpace: "nowrap" }}
          >
            {props.trailing}
          </T>
        ) : null}
      </div>
    </Block>
  );
}

export function ProjectSummaryView(props: ProjectSummaryProps): JSX.Element {
  const rows = projectSummaryRows(props);
  return <>{rows}</>;
}

export function projectSummaryRows(
  props: ProjectSummaryProps,
  inset: number = PAGE_INSET,
): JSX.Element[] {
  const t = useAdwaita();
  const { color } = t;

  if (
    props.error !== null &&
    props.error !== undefined &&
    props.error.length > 0
  ) {
    return [
      <Block
        key="error"
        inset={inset}
        gap={t.space.xs}
        style={{ paddingTop: t.space.md }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: t.space.sm,
          }}
        >
          <Icon
            name="warning"
            size={STATE_GLYPH}
            color={color.functional.warning}
            style={{ flexShrink: 0 }}
          />
          <T
            size="body"
            color={color.text.primary}
            style={{ flexGrow: 1, minWidth: 0 }}
          >
            {"Project summary unavailable"}
          </T>
          {props.onReload !== undefined ? (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: t.space.xs,
                cursor: "pointer",
              }}
              onClick={props.onReload}
            >
              <Icon
                name="refresh"
                size={INLINE_GLYPH}
                color={mutedText(t)}
                style={{ flexShrink: 0 }}
              />
              <T size="caption" color={mutedText(t)}>
                {"Retry"}
              </T>
            </div>
          ) : null}
        </div>
        <T size="caption" color={mutedText(t)} clamp={2}>
          {props.error}
        </T>
      </Block>,
    ];
  }

  const model = props.model;
  if (model === null) {
    const bar = (width: number, height: number, key: string): JSX.Element => (
      <div
        key={key}
        style={{
          width,
          height,
          borderRadius: t.radius.sm,
          backgroundColor: color.surface.button,
          pointerEvents: "none",
        }}
      />
    );
    return [
      <Block
        key="loading"
        inset={inset}
        gap={t.space.md}
        style={{ paddingTop: t.space.md }}
      >
        {bar(monoColumn(t, SKELETON_TITLE_CHARS), t.type.title1, "title")}
        {...SKELETON_META_CHARS.map((chars, i) =>
          bar(monoColumn(t, chars), t.type.caption, `meta-${i}`),
        )}
      </Block>,
    ];
  }

  const { identity, meta, activity } = model;
  const graph = generateGraphData(
    activity.recent.map((f) => ({
      id: f.change.commit_id,
      parents: f.change.parents,
    })),
  );
  const laneCount = graphLaneCount(graph);
  const dot = languageColor(meta.language);

  const metaSegments: string[] = [];
  if (meta.language !== null) metaSegments.push(meta.language);
  if (meta.license !== null) metaSegments.push(meta.license);

  const rows: JSX.Element[] = [
    <Block
      key="identity"
      inset={inset}
      gap={0}
      style={{ paddingTop: t.space.md, paddingBottom: t.space.sm }}
    >
      <div style={centerRow(t.space.lg, { width: "100%" })}>
        <div style={column(t.space.xs, { flexGrow: 1, flexBasis: 0 })}>
          <div style={centerRow(t.space.sm)}>
            <Icon
              name="folder"
              size={glyphForText(t.type.body)}
              color={mutedText(t)}
              style={{ flexShrink: 0 }}
            />
            <T
              size="body"
              weight={titleWeight(t)}
              color={color.text.primary}
              style={ellipsis({ lineHeight: lineBox(t, "body") })}
            >
              {identity.name}
            </T>
          </div>
          <div style={centerRow(t.space.sm)}>
            {dot !== null ? (
              <div
                style={{
                  width: STATUS_DOT,
                  height: STATUS_DOT,
                  borderRadius: STATUS_DOT_RADIUS,
                  backgroundColor: dot,
                  flexShrink: 0,
                  pointerEvents: "none",
                }}
              />
            ) : null}
            <T
              size="micro"
              color={mutedText(t)}
              style={{
                lineHeight: lineBox(t, "micro"),
                whiteSpace: "nowrap",
              }}
            >
              {metaSegments.join(" · ")}
            </T>
          </div>
        </div>
        {identity.isRepo ? (
          <div style={centerRow(0, { flexShrink: 0 })}>
            <Sparkline
              values={model.weekly}
              color={color.functional.success}
              style={{ pointerEvents: "none" }}
            />
          </div>
        ) : null}
      </div>
    </Block>,
  ];

  if (identity.isRepo) {
    rows.push(
      <Block
        key="heatmap"
        inset={inset}
        gap={0}
        style={{ paddingTop: t.space.md, paddingBottom: t.space.md }}
      >
        <ContributionHeatmap
          weeks={activity.weeks}
          dayLabels={activity.dayLabels}
        />
      </Block>,
    );

    if (activity.recent.length > 0) {
      rows.push(
        <SectionTitle
          key="changes-title"
          title="Changes"
          trailing={`${formatCount(activity.stats.total)} total`}
          inset={inset}
        />,
      );
      activity.recent.slice(0, FEED_LIMIT).forEach((feed, i) => {
        rows.push(
          <div
            key={feed.change.commit_id}
            style={{
              width: "100%",
              flexShrink: 0,
              paddingLeft: inset,
              paddingRight: inset,
            }}
          >
            <ChangeFeedRow
              feed={feed}
              node={graph[i]}
              prev={i > 0 ? graph[i - 1] : null}
              laneCount={laneCount}
              onPick={
                props.onPrompt === undefined
                  ? undefined
                  : () =>
                      props.onPrompt?.(
                        `Tell me about change ${feed.change.change_id.slice(0, 8)} in ${identity.name}: what it did, and what is left to finish.`,
                      )
              }
            />
          </div>,
        );
      });
    }
  }

  const pills = props.pills ?? [];
  if (props.onPrompt !== undefined && pills.length > 0) {
    rows.push(
      <SectionTitle
        key="pills-title"
        title="Start here"
        trailing={`${pills.length} prompt ${pills.length === 1 ? "template" : "templates"}`}
        inset={inset}
      />,
      <Block
        key="pills"
        inset={inset}
        gap={t.space.sm}
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          paddingBottom: t.space.md,
        }}
      >
        {pills.map((pill) => (
          <Button
            key={pill.name}
            variant="pill"
            size="sm"
            onClick={() => props.onPrompt?.(pill.invocation)}
            style={{ flexShrink: 0 }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: t.space.xs,
                pointerEvents: "none",
              }}
            >
              <T
                size="caption"
                color={color.text.primary}
                style={{ whiteSpace: "nowrap" }}
              >
                {`/${pill.name}`}
              </T>
              {pill.hint.length > 0 ? (
                <T
                  size="caption"
                  color={mutedText(t)}
                  style={{ whiteSpace: "nowrap" }}
                >
                  {pill.hint}
                </T>
              ) : null}
            </div>
          </Button>
        ))}
      </Block>,
    );
  }

  return rows;
}
