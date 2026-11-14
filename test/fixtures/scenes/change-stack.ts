import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import {
  VCS_DESCRIBE_TOOL,
  VCS_LOG_TOOL,
  VCS_OPLOG_TOOL,
} from "../../../src/plugins/vcs/constants";
import { answer, at, usage, userTurn } from "../turn";
import { toolCallFixture } from "../tool";

const AUTHOR = "knoopx@gmail.com";

const LOG_TEXT = [
  "change        commit        author            date                 description                                bookmarks  tags  files",
  `lwkqvtz4pwus  41c0d7b2f9ae  ${AUTHOR}  2026-11-14 12:41:07  docs(readme): the two split scenes        main       -     README.md`,
  `nz3xkq7wvpml  7ce44a19bd08  ${AUTHOR}  2026-11-14 12:38:55  docs(readme): the caption under the panel shot  -   -     README.md`,
  `xuxtywxwsupv  563c2add2d1f  ${AUTHOR}  2026-11-14 12:31:12  fix(env): keep mu's loader paths out of the children it spawns  -  -  flake.nix`,
  `suywnypuzmsz  31d1e6d70659  ${AUTHOR}  2026-11-14 12:22:40  chore(deps): bump the adwaita-gpuix source pin to ac89bb4  -  -  bun.lock`,
].join("\n");

/** The same four changes as the log paints them: the id is the row, the bookmark rides its badge. */
const LOG_ROWS = [
  {
    change: "lwkqvtz4pwus",
    commit: "41c0d7b2f9ae",
    author: AUTHOR,
    date: "2026-11-14 12:41:07",
    description: "docs(readme): the two split scenes",
    bookmarks: "main",
    tags: "",
    files: "README.md",
  },
  {
    change: "nz3xkq7wvpml",
    commit: "7ce44a19bd08",
    author: AUTHOR,
    date: "2026-11-14 12:38:55",
    description: "docs(readme): the caption under the panel shot",
    bookmarks: "",
    tags: "",
    files: "README.md",
  },
  {
    change: "xuxtywxwsupv",
    commit: "563c2add2d1f",
    author: AUTHOR,
    date: "2026-11-14 12:31:12",
    description:
      "fix(env): keep mu's loader paths out of the children it spawns",
    bookmarks: "",
    tags: "",
    files: "flake.nix",
  },
  {
    change: "suywnypuzmsz",
    commit: "31d1e6d70659",
    author: AUTHOR,
    date: "2026-11-14 12:22:40",
    description: "chore(deps): bump the adwaita-gpuix source pin to ac89bb4",
    bookmarks: "",
    tags: "",
    files: "bun.lock",
  },
];

/** The write that named the squashed change: the ids it resolved, and the description that landed. */
const SQUASHED_TEXT = [
  "commit        change        message                                       status",
  "2b7f60d4ac19  lwkqvtz4pwus  docs(readme): what the changes scenes show    ok",
].join("\n");

export const CHANGE_STACK_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-squash-docs",
    "the two docs changes on top are one thought I typed twice. squash them, name the result myself, and leave the loader fix alone — it has a bookmark on it for a reason",
    0,
  ),
  toolCallFixture(
    "call-vcs-log",
    VCS_LOG_TOOL,
    { rev: "ancestors(@, 4)", limit: 4, format: "full" },
    "ok",
    LOG_TEXT,
    {
      startTs: at(3_000),
      details: {
        vcs: "jj",
        rev: "ancestors(@, 4)",
        status: "ok",
        commit_count: 4,
        rows: LOG_ROWS,
        error: "",
      },
    },
  ),
  toolCallFixture(
    "call-vcs-squash",
    VCS_DESCRIBE_TOOL,
    {
      hash: "lwkqvtz4pwus",
      message: "docs(readme): what the changes scenes show",
    },
    "ok",
    SQUASHED_TEXT,
    {
      startTs: at(8_000),
      details: {
        commit: "2b7f60d4ac19",
        change: "lwkqvtz4pwus",
        previous_commit: "41c0d7b2f9ae",
        previous_change: "lwkqvtz4pwus",
        message: "docs(readme): what the changes scenes show",
        status: "ok",
        error: "",
      },
    },
  ),
  {
    ...answer(
      "a-squash-docs",
      "One change now, `lwkqvtz4pwus`, reading `docs(readme): what the changes scenes show`, with the second caption's text folded in. `main` still points at it, so the bookmark did not move and the loader fix underneath is untouched — jj rewrites the change you name and rebases what sits on it, it does not reach downward.",
      {
        reasoning:
          "Two adjacent docs changes are one change typed twice; the risk is the bookmark, which is why the answer names where `main` ended up. The description is the user's own wording, kept verbatim — a describe is theirs, not mine.",
      },
    ),
    usage: usage(8_900, 1_180, 0, 1, 2),
  },
];

const OP_ROWS = [
  "op            when               description",
  "01k3f9c2      12:41:07           new change 8b2d63e0",
  "01k3f9b7      12:38:55           describe change 6d1c4b0a",
  "01k3f9a4      12:31:12           abandon change 1c7f9a44",
  "01k3f8x1      12:22:40           rebase 4 changes onto main",
].join("\n");

export const OPLOG_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-oplog",
    "a change of mine vanished about ten minutes ago and I did not delete it on purpose. jj knows what happened — show me, and do not undo anything yet",
    0,
  ),
  toolCallFixture("call-oplog", VCS_OPLOG_TOOL, { limit: 4 }, "ok", OP_ROWS, {
    startTs: at(3_000),
    details: {
      vcs: "jj",
      status: "ok",
      op_count: 4,
      rows: [
        {
          op: "01k3f9c2",
          time: "12:41:07",
          description: "new change 8b2d63e0",
        },
        {
          op: "01k3f9b7",
          time: "12:38:55",
          description: "describe change 6d1c4b0a",
        },
        {
          op: "01k3f9a4",
          time: "12:31:12",
          description: "abandon change 1c7f9a44",
        },
        {
          op: "01k3f8x1",
          time: "12:22:40",
          description: "rebase 4 changes onto main",
        },
      ],
      error: "",
    },
  }),
  {
    ...answer(
      "a-oplog",
      "`01k3f9a4` at 12:31:12 abandoned `1c7f9a44` — that is the change, and it is still in the repo: jj's abandon takes it out of the visible tree, it does not erase it. Stand on that operation and read its patch before you restore, because restoring moves the whole workspace back to that point, not just the one change. If you only want the change and not the rebase that followed it, the fix is to edit the files back rather than to walk the operation log backwards.",
      {
        reasoning:
          "The op log is jj's answer to 'what happened', so the read is the answer here; the write is a separate decision the user has not made yet. Restoring an operation is not the same as restoring a change, and saying which one is cheaper is the part that matters.",
      },
    ),
    usage: usage(7_300, 980, 0, 1, 2),
  },
];
