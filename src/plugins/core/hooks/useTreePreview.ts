import { useMemo } from "react";
import type { TreeSnapshot } from "../lib/session/chatSession";
import {
  pathMessages,
  pathStartTs,
  type TreeRow,
} from "../lib/session/sessionTree";
import { transcriptItemsFromMessages } from "../lib/agent/transcriptState";
import type { SessionPreviewData } from "../lib/session/sessionList";

export function useTreePreview(
  snapshot: TreeSnapshot | null,
  row: TreeRow | null,
): SessionPreviewData | null {
  return useMemo(() => {
    if (snapshot === null || row === null) return null;
    const items = transcriptItemsFromMessages(
      pathMessages(snapshot.tree, row.id),
    );
    return {
      label: row.text,
      age: row.meta,
      items,
      empty: items.length === 0,
      startTs: pathStartTs(snapshot.tree, row.id),
    };
  }, [snapshot, row]);
}
