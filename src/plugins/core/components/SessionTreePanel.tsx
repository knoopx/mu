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
  useListWindow,
  type GraphNode,
} from "adwaita-gpuix";
import type { PublicInstance } from "@gpuix/react";
import { ellipsisFill } from "../lib/ui/layout";
import { usePanelChrome } from "../lib/composer/chrome";
import { mutedText } from "../lib/ui/theme";
import {
  MARKER_GLYPH,
  ROW_HEIGHT,
  emphasisWeight,
  plainWeight,
} from "../lib/ui/tokens";
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
      : mutedText(t);
  return (
    <ListRow
      selected={selected}
      focused={focused}
      height={ROW_HEIGHT}
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
          size={MARKER_GLYPH}
          color={row.role === "tool" ? mutedText(t) : text}
        />
        {row.label !== undefined && row.label.length > 0 && (
          <T
            size="caption"
            weight={emphasisWeight(t)}
            color={color.functional.warning}
            style={{ flexShrink: 0 }}
          >
            {row.label}
          </T>
        )}
        <T
          size="caption"
          weight={active ? emphasisWeight(t) : plainWeight(t)}
          color={text}
          style={ellipsisFill()}
        >
          {row.text}
        </T>
        <T
          size="caption"
          color={row.leaf ? color.accent.base : mutedText(t)}
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
  const win = useListWindow(rows.length, ROW_HEIGHT);
  const windowed = win.slice(rows);

  return (
    <div style={s.fillColumn}>
      {rows.length === 0 ? (
        <div style={s.emptyPane}>
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
          estimatedItemHeight={ROW_HEIGHT}
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
              <div key={row.id} style={s.rowSlot}>
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
