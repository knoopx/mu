import {
  AgentBridge,
  type SessionDeleteResult,
  type SessionInfo,
} from "../agent/agentService";
import { transcriptItemsFromMessages } from "../agent/transcriptState";
import type { TranscriptItem } from "../agent/transcriptState";
import { relativeAge } from "../utils/time";

export const SESSION_ROWS_CAP = 25;

export interface SessionListRow {
  path: string;
  label: string;
  caption?: string;
  age: string;
}

export interface SessionPreviewData {
  label: string;
  age: string;
  items: TranscriptItem[];
  empty: boolean;
  startTs?: number;
}

export interface SessionList {
  rows(cwd: string): Promise<SessionListRow[]>;
  preview(row: SessionListRow, cwd: string): SessionPreviewData;
  remove(path: string): SessionDeleteResult;
}

const linesOf = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

export function sessionRows(
  sessions: readonly SessionInfo[],
): SessionListRow[] {
  return sessions.map((s) => {
    const lines = linesOf((s.name ?? s.firstMessage).trim());
    const caption = lines.slice(1).join(" · ");
    return {
      path: s.path,
      label: lines[0] ?? "(no message)",
      ...(caption === "" ? {} : { caption }),
      age: relativeAge(s.modified),
    };
  });
}

export const byRecentSession = (a: SessionInfo, b: SessionInfo): number =>
  b.modified.getTime() - a.modified.getTime();

const previewOf = (
  row: SessionListRow,
  items: TranscriptItem[],
  startTs?: number,
): SessionPreviewData => ({
  label: row.label,
  age: row.age,
  items,
  empty: items.length === 0,
  ...(startTs === undefined ? {} : { startTs }),
});

export const liveSessionList: SessionList = {
  rows: (cwd) =>
    AgentBridge.listSessions(cwd).then((all) =>
      sessionRows([...all].sort(byRecentSession).slice(0, SESSION_ROWS_CAP)),
    ),
  preview: (row, cwd) => {
    try {
      const items = transcriptItemsFromMessages(
        AgentBridge.readSessionMessages(row.path, cwd),
      );
      return previewOf(row, items, AgentBridge.readSessionStartTs(row.path));
    } catch {
      return previewOf(row, []);
    }
  },
  remove: (path) => AgentBridge.deleteSession(path),
};
