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
  type SemanticColors,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { PAGE_INSET } from "../lib/ui/transcriptLayout";
import { centerRow, column, ellipsis, ellipsisFill } from "../lib/ui/layout";
import { mutedText } from "../lib/ui/theme";
import {
  FEED_COUNT,
  type FeedChange,
  type ProjectSummaryModel,
} from "../lib/project/projectSummary";
import type { PromptPill } from "../lib/project/promptTemplates";

export const CHANGE_ROW_HEIGHT = 24;

const IDENTITY_ROW_HEIGHT = 64;

const ID_COLUMN_WIDTH = 72;
const AGE_COLUMN_WIDTH = 80;

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
  color: SemanticColors;
  onPick?: () => void;
}): JSX.Element {
  const { change, bookmarks } = props.feed;
  const descColor =
    change.description === "(no description)"
      ? props.color.text.dim
      : props.color.text.primary;
  return (
    <ListRow
      height={CHANGE_ROW_HEIGHT}
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
            width: ID_COLUMN_WIDTH,
            flexShrink: 0,
            fontFamily: "monospace",
            fontSize: 11,
            color: props.color.text.dim,
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
            size={12}
            color={props.color.functional.destructive}
            style={{ flexShrink: 0 }}
          />
        ) : null}
        <div
          style={{
            width: AGE_COLUMN_WIDTH,
            flexShrink: 0,
            textAlign: "right",
            fontSize: 10,
            color: props.color.text.dim,
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
  const { color } = useAdwaita();
  return (
    <Block
      inset={props.inset}
      gap={4}
      style={{ paddingTop: 8, paddingBottom: 4 }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "baseline",
          gap: 6,
        }}
      >
        <T size="title4" weight={700} color={color.text.primary}>
          {props.title}
        </T>
        {props.trailing !== undefined ? (
          <T
            size="caption"
            color={color.text.dim}
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
        gap={4}
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
            size={16}
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
                gap: 4,
                cursor: "pointer",
              }}
              onClick={props.onReload}
            >
              <Icon
                name="refresh"
                size={14}
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
        {bar(220, 20, "a")}
        {bar(460, 13, "b")}
        {bar(320, 13, "c")}
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
        <div style={column(4, { flexGrow: 1, flexBasis: 0 })}>
          <div style={centerRow(6)}>
            <Icon
              name="folder"
              size={15}
              color={color.text.dim}
              style={{ flexShrink: 0 }}
            />
            <T
              size="body"
              weight={700}
              color={color.text.primary}
              style={ellipsis({ lineHeight: 18 })}
            >
              {identity.name}
            </T>
          </div>
          <div style={centerRow(6)}>
            {dot !== null ? (
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: dot,
                  flexShrink: 0,
                  pointerEvents: "none",
                }}
              />
            ) : null}
            <T
              size="caption"
              color={color.text.dim}
              style={{ fontSize: 11, lineHeight: 14, whiteSpace: "nowrap" }}
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
        style={{ paddingTop: 12, paddingBottom: 12 }}
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
              color={color}
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
        gap={6}
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
                gap: 6,
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
                  color={color.text.dim}
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
