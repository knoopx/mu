/**
 * The lane diagram beside the stack.
 *
 * The graph is drawn from the rows the panel is showing, so a filtered revset
 * gets its own picture of the lanes it holds.
 */
import { useMemo } from "react";
import {
  generateGraphData,
  graphLaneCount,
  type GraphNode,
} from "adwaita-gpuix";
import { type Change } from "adwaita-gpuix";

export interface ChangeGraph {
  graph: readonly GraphNode[];
  laneCount: number;
}

export function useChangeGraph(rows: readonly Change[]): ChangeGraph {
  const graph = useMemo(
    () =>
      generateGraphData(
        rows.map((change) => ({
          id: change.commit_id,
          parents: change.parents,
        })),
      ),
    [rows],
  );
  const laneCount = useMemo(() => graphLaneCount(graph), [graph]);
  return { graph, laneCount };
}
