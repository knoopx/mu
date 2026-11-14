/**
 * The repository a story paints.
 *
 * The change stack and the operation log read jj live, which in a story means a
 * subprocess for every read and a PNG that says whatever the working copy looked
 * like at the second it was written. Here the same reads answer as data. The
 * change ids are the ones the scene's own `vcs-log` rows print, so the panel and
 * the transcript above it describe one repository.
 */
import type { Bookmark, Change, FileChange } from "adwaita-gpuix";
import type { RepoSource } from "../../src/plugins/vcs/components/RepoSource";
import type { OplogOutcome, OpPatchOutcome } from "../../src/plugins/vcs/lib/ops";
import type { OplogRow } from "../../src/plugins/vcs/types";

const CHANGES: Change[] = [
  {
    change_id: "lwkqvtz4pwus",
    commit_id: "2b7f60d4ac19",
    description: "docs(readme): what the changes scenes show",
    author: "knoopx",
    timestamp: "2026-11-14 09:41:12 +01:00",
    immutable: false,
    empty: false,
    has_conflicts: false,
    parents: ["xuxtywxwsupv"],
  },
  {
    change_id: "xuxtywxwsupv",
    commit_id: "563c2add2d1f",
    description: "fix(env): keep mu's loader paths out of the children it spawns",
    author: "knoopx",
    timestamp: "2026-11-13 21:04:38 +01:00",
    immutable: false,
    empty: false,
    has_conflicts: false,
    parents: ["suywnypuzmsz"],
  },
  {
    change_id: "suywnypuzmsz",
    commit_id: "31d1e6d70659",
    description: "chore(deps): bump the adwaita-gpuix source pin to ac89bb4",
    author: "knoopx",
    timestamp: "2026-11-12 18:22:05 +01:00",
    immutable: false,
    empty: false,
    has_conflicts: false,
    parents: ["olxkxwupqkzy"],
  },
];

const BOOKMARKS: Bookmark[] = [
  {
    name: "main",
    change_id: "lwkqvtz4pwus",
    description: "docs(readme): what the changes scenes show",
    author: "knoopx",
    remote: "",
    reference: "refs/heads/main",
  },
];

const CHANGED_FILES: FileChange[] = [
  { status: "M", path: "README.md", insertions: 12, deletions: 4 },
  {
    status: "M",
    path: ".storybook/fixtures/scenes/change-stack.ts",
    insertions: 38,
    deletions: 0,
  },
  {
    status: "M",
    path: "src/plugins/core/components/composer/panels.tsx",
    insertions: 21,
    deletions: 7,
  },
];

/** The patch the preview pane draws under the first of those files. */
const PATCH = [
  "diff --git a/README.md b/README.md",
  "index 1a4b8c2..9f0d7e4 100644",
  "--- a/README.md",
  "+++ b/README.md",
  "@@ -18,10 +18,18 @@",
  " ## Changes",
  " ",
  "-![the change stack](stories/Changes/panel.png)",
  "+![the change stack](stories/Changes/panel.png)",
  "+![the operation log](stories/Changes/oplog.png)",
  "+",
  "+Two panels over the same repository: the stack of changes the working copy",
  "+stands on, and jj's own record of how it got there.",
  " ",
  " Each row says what the change is, and the preview pane says what it did.",
  " ",
].join("\n");

const OPLOG: OplogRow[] = [
  { op: "01K3F9A4Q0", time: "12:31:12", description: "abandon 1c7f9a44" },
  { op: "01K3F98Y7M", time: "12:30:58", description: "squash lwkqvtz4pwus" },
  { op: "01K3F97T2B", time: "12:29:40", description: "describe 2b7f60d4ac19" },
  { op: "01K3F96H0W", time: "12:28:03", description: "new change 563c2add2d1f" },
  { op: "01K3F95C1L", time: "11:58:47", description: "undo" },
  { op: "01K3F94A9K", time: "11:52:20", description: "rebase lwkqvtz4pwus" },
];

/** One operation's whole patch: the panel cuts this into its file rows. */
const OP_PATCH = [
  "diff --git a/README.md b/README.md",
  "index 9f0d7e4..1a4b8c2 100644",
  "--- a/README.md",
  "+++ b/README.md",
  "@@ -18,8 +18,10 @@",
  " ## Changes",
  " ",
  " ![the change stack](stories/Changes/panel.png)",
  "-![the operation log](stories/Changes/oplog.png)",
  "-",
  "-Two panels over the same repository: the stack of changes the working copy",
  "-stands on, and jj's own record of how it got there.",
  "+",
  " Each row says what the change is, and the preview pane says what it did.",
].join("\n");

export const STAGE_REPO: RepoSource = {
  workspaceRoot: () => process.cwd(),
  // Nothing to watch: a story is one frozen moment, and a poll watcher would be
  // a timer running beside a picture.
  opHeadPath: () => null,
  changes: async () => CHANGES,
  bookmarks: async () => BOOKMARKS,
  currentChangeId: async () => CHANGES[1].change_id,
  changedFiles: async () => CHANGED_FILES,
  diff: async (_changeId, filePath) =>
    filePath === undefined || filePath === "README.md" ? PATCH : "",
  fileBytes: async () => null,
  oplog: async (): Promise<OplogOutcome> => ({
    status: "ok",
    rows: OPLOG,
    error: "",
  }),
  opPatch: async (): Promise<OpPatchOutcome> => ({
    status: "ok",
    patch: OP_PATCH,
    error: "",
  }),
};
