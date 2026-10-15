import type { SessionInfo } from "../../src/plugins/core/lib/agent/agentService";

const SESSION_DIR = "--home-knoopx-Projects-gpuix-apps-mu--";

const session = (
  stamp: string,
  uuid: string,
  firstMessage: string,
  messageCount: number,
): SessionInfo => {
  const modified = new Date(stamp);
  return {
    path: `~/.pi/agent/sessions/${SESSION_DIR}/${stamp.replace(/[:.]/g, "-")}_${uuid}.jsonl`,
    id: uuid,
    cwd: "/home/knoopx/Projects/gpuix-apps/mu",
    created: modified,
    modified,
    messageCount,
    firstMessage,
    allMessagesText: firstMessage,
  };
};

export const SESSIONS_FIXTURE: SessionInfo[] = [
  session(
    "2026-11-07T09:14:00.000Z",
    "019a4c1e-6b2d-7f31-9c02-81d5c2f9b410",
    "the photo strip crops my pictures — the star trails lose the ridge and the portrait loses the skyline",
    52,
  ),
  session(
    "2026-11-07T07:52:00.000Z",
    "019a4bc0-44aa-7d19-88f1-2e6b7a0c55d3",
    "the ask panel is one row short: the last option sits under the hint bar and the bar paints over it",
    46,
  ),
  session(
    "2026-11-06T18:20:00.000Z",
    "019a48f1-90de-7a44-b7ab-3c1e88f0d217",
    "Ctrl+R reverse search over every session in this folder, newest first, picked message back in the composer",
    131,
  ),
  session(
    "2026-11-06T15:41:00.000Z",
    "019a4872-1f3c-7c8e-a1d4-4b9c07ea66f2",
    "paste a screenshot with Ctrl+V and the agent must see the pixels, not a filename",
    64,
  ),
  session(
    "2026-11-05T21:04:00.000Z",
    "019a44b7-52ab-7e55-9a70-77d1c9b34a08",
    "the tree panel jumps when I arrow onto a side branch — land the prompt in the draft, do not scroll the window",
    97,
  ),
  session(
    "2026-11-05T11:33:00.000Z",
    "019a42c9-88d1-72bb-8d43-9f2a5e10c7b6",
    "the context ring on the model pill should fill along the border, orange at 70%, red at 90%",
    52,
  ),
  session(
    "2026-11-04T19:47:00.000Z",
    "019a3f55-c3aa-7d61-b60f-1a8e4d7290cb",
    "keep long tool output inside the row, never push the conversation off screen",
    118,
  ),
  session(
    "2026-11-04T09:02:00.000Z",
    "019a3d21-70bc-7f28-92ce-6d3b8a5f1e47",
    "add the web search plugin: duckduckgo, ten results, the pages it read stay in the transcript",
    74,
  ),
  session(
    "2026-11-03T16:26:00.000Z",
    "019a3ac4-2d9e-7a13-8f5c-05b7e6312d9a",
    "ask-user in the composer slot: question, context, numbered options, the hint bar as the only footer",
    156,
  ),
  session(
    "2026-11-03T08:15:00.000Z",
    "019a3977-6f11-7c39-b4d8-2c90af4e7b35",
    "derive the app theme from the adwaita scheme and accent, no literals in components",
    41,
  ),
  session(
    "2026-11-02T14:08:00.000Z",
    "019a36d0-ab55-7042-a1e7-83f2c60b9d14",
    "the changes panel: jj log, the files of a change, the diff, and the working copy with no description",
    83,
  ),
  session(
    "2026-11-01T17:59:00.000Z",
    "019a33b8-91cc-7d76-88a1-4e07d2f5a6bc",
    "status bar: project, bookmark, turns, tokens, wall time, tokens per second, cost",
    29,
  ),
  session(
    "2026-10-31T10:22:00.000Z",
    "019a2f04-2f7a-7bb3-9d62-58c1e07a3fd9",
    "session list: label, age, first message, arrow to preview, type to narrow, delete with Undo",
    67,
  ),
  session(
    "2026-10-30T13:35:00.000Z",
    "019a2c8d-40e6-74fa-a903-71b5d8c22ae1",
    "one pane scrolls, the window root never scrolls — audit every panel against that rule",
    112,
  ),
];
