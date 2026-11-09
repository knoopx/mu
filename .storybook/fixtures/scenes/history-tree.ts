import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, usage, userTurn } from "../turn";

const TREE_ROWS = [
  "#  kind        text",
  "1  user        the ring around the composer is drawn at 1x and measured at 2x",
  "2  tool        read  src/plugins/core/lib/composer/panelHeight.ts",
  "3  user        no — go back, that is the wrong panel",
  "4  branch      (side branch, 6 rows, abandoned)",
  "5  compaction  span archived to 2 frames",
  "6  user        the terminal panel's stty size disagrees with what the pane counted",
  "7  tool        bash  stty size -f /dev/pts/3",
  "8  assistant   the pane subtracted the scrollbar it does not have",
].join("\n");

export const HISTORY_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-tree-fork",
    "i forked back to before the diff work and the answer i liked is gone. it is still in here somewhere — show me the tree and put me back on the branch that had it",
    0,
  ),
  ran(
    "c-tree-read",
    "bash",
    { command: "mu tree --session current --kinds user,tool,branch,compaction" },
    TREE_ROWS,
    3_000,
  ),
  ran(
    "c-grep-leaf",
    "grep",
    { pattern: "leafId", path: "src/plugins/core/lib/session" },
    [
      "src/plugins/core/lib/session/treeWalk.ts:22: export function leafOf(nodes: SessionTreeNode[]): SessionTreeNode | null {",
      "src/plugins/core/hooks/useSessionTree.ts:41: const cursor = findIndex(state.tree, state.leafId);",
      "src/plugins/core/hooks/useSessionTree.ts:96: chat.jumpTo(node.id); // rewinds the log; the branch stays in the tree",
    ].join("\n"),
    7_000,
  ),
  {
    ...answer(
      "a-tree-fork",
      "Nothing was deleted: a conversation is a tree, and rewinding to node 3 left the six rows you wrote after it on their own branch, still in the tree. Standing on row 4 and pressing Enter puts you back at the end of it — the current line moves, the branch you leave stays where it is. If that branch opened with one of your own prompts, the jump hands the prompt back into the draft, and the tree closes on it because the tree takes the whole slot and would hide the very draft it just gave you.",
      {
        reasoning:
          "The user's word was 'gone', which is what a linear log implies. The tree says otherwise, so the answer is a pointer, not a recovery. Also worth naming: the compaction row sits above the fork, so archiving is not what lost the text.",
      },
    ),
    usage: usage(12_100, 1_610, 0, 1, 2),
  },
];
