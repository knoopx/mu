import { useRef, type JSX } from "react";
import {
  EmptyDescription,
  GraphGutter,
  Icon,
  ListRow,
  RowShell,
  T,
  VirtualListPanel,
  useAdwaita,
  type GraphNode,
} from "adwaita-gpuix";
import type { PublicInstance } from "@gpuix/react";
import { ellipsisFill } from "../lib/ui/layout";
import { usePanelChrome } from "../lib/composer/chrome";
import { useListWindow } from "../lib/ui/listWindow";
import { TREE_ROW_HEIGHT } from "../hooks/useSessionTree";
import type {
  TreeFilter,
  TreeModel,
  TreeRow,
} from "../lib/session/sessionTree";

function TreeRowView({
  row,
  node,
  prev,
  laneCount,
  index,
  selected,
  focused,
  onSelect,
}: {
  row: TreeRow;
  node: GraphNode;
  prev: GraphNode | null;
  laneCount: number;
  index: number;
  selected: boolean;
  focused: boolean;
  onSelect: (index: number) => void;
}): JSX.Element {
  const t = useAdwaita();
  const color = t.color;
  const active = selected && focused;
  const text = active
    ? color.accent.base
    : row.active
      ? color.text.primary
      : color.text.dim;
  return (
    <ListRow
      selected={selected}
      focused={focused}
      height={TREE_ROW_HEIGHT}
      onClick={() => onSelect(index)}
    >
      <RowShell>
        <GraphGutter
          node={node}
          prev={prev}
          laneCount={laneCount}
          selected={selected}
          dotStroke={row.leaf ? color.accent.base : undefined}
          selectedStroke={color.text.primary}
        />
        <Icon
          name={row.icon}
          size={12}
          color={row.role === "tool" ? color.text.dim : text}
        />
        {row.label !== undefined && row.label.length > 0 && (
          <T
            size="caption"
            weight={600}
            color={color.functional.warning}
            style={{ flexShrink: 0 }}
          >
            {row.label}
          </T>
        )}
        <T
          size="caption"
          weight={active ? 600 : 400}
          color={text}
          style={ellipsisFill()}
        >
          {row.text}
        </T>
        <T
          size="caption"
          color={row.leaf ? color.accent.base : color.text.dim}
          style={{
            fontFamily: t.type.fontFamilyMono,
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {row.leaf ? "here" : row.meta}
        </T>
      </RowShell>
    </ListRow>
  );
}

export interface SessionTreePanelProps {
  model: TreeModel;
  sel: number;
  focused?: boolean;
  listRef?: { current: PublicInstance | null };
  onSelect: (index: number) => void;
}

export function SessionTreePanel({
  model,
  sel,
  focused = true,
  listRef,
  onSelect,
}: SessionTreePanelProps): JSX.Element {
  const s = usePanelChrome();
  const fallbackListRef = useRef<PublicInstance | null>(null);
  const rows = model.rows;
  const win = useListWindow(rows.length, TREE_ROW_HEIGHT);
  const windowed = win.slice(rows);

  return (
    <div style={s.fillColumn}>
      {rows.length === 0 ? (
        <div
          style={{
            display: "flex",
            flexGrow: 1,
            minHeight: 0,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <EmptyDescription>
            {model.total === 0
              ? "This session has no history yet"
              : "No entries match this filter"}
          </EmptyDescription>
        </div>
      ) : (
        <VirtualListPanel
          listRef={listRef ?? fallbackListRef}
          bare
          estimatedItemHeight={TREE_ROW_HEIGHT}
          itemCount={win.itemCount}
          windowStart={win.windowStart}
          overdraw={win.overdraw}
          onVisibleRange={win.onVisibleRange}
        >
          {windowed.map((row, offset) => {
            const index = win.at(offset);
            const node = model.graph[index];
            if (node === undefined) return null;
            return (
              <div
                key={row.id}
                style={{ display: "flex", width: "100%", flexShrink: 0 }}
              >
                <TreeRowView
                  row={row}
                  node={node}
                  prev={index > 0 ? (model.graph[index - 1] ?? null) : null}
                  laneCount={model.laneCount}
                  index={index}
                  selected={index === sel}
                  focused={focused}
                  onSelect={onSelect}
                />
              </div>
            );
          })}
        </VirtualListPanel>
      )}
    </div>
  );
}
