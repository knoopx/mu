/**
 * Draws a tree call in the transcript: the tree itself, what it measured, and —
 * when a node had no name to draw — the nodes that were not.
 *
 * The chips, the notes, the truncation and the running block are core's. This
 * file owns two things: the words a tree answer has that no other answer has, and
 * the tree. The tree is adwaita's own rows, drawn from the nodes the call left in
 * its details, so it wears the theme the window is wearing right now and a
 * session resumed next week still draws it — and its folders still open and close
 * under the cursor, which a picture of a tree could not.
 */

import type { JSX } from "react";
import { type BadgeVariant, type IconName, useAdwaita } from "adwaita-gpuix";
import { FileTree } from "adwaita-gpuix/ai";

import { counted } from "../../core/lib/agent/toolText";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import {
  ToolRowList,
  ToolRunning,
  ToolStatusNote,
  ToolUnknownResult,
} from "../../core/components/ToolDataRows";
import {
  headerLineOf,
  toolPreviewLine,
  type ToolPreviewVocabulary,
} from "../../core/lib/agent/toolPreview";
import {
  toolBodyStack,
  type ToolPaintRow,
  type ToolRowCell,
  type ToolRowTone,
} from "../../core/lib/ui/toolRowPaint";
import { mutedText } from "../../core/lib/ui/theme";
import { TREE_RENDER_TOOL } from "../constants";
import { fileTreeOf } from "../lib/structure";
import {
  treeFailureLine,
  treeToolViewOf,
  type TreeToolView,
} from "../lib/toolView";

const RUNNING_TEXT: Record<string, string> = {
  [TREE_RENDER_TOOL]: "drawing the tree",
};

const EMPTY_TEXT: Record<string, string> = {
  [TREE_RENDER_TOOL]: "no named nodes to draw",
};

/** A tree answer's own words, so the header never has to guess. */
const TREE_WORDS: ToolPreviewVocabulary = {
  running: RUNNING_TEXT,
  runningDefault: "drawing the tree",
  clean: ["empty"],
  empty: EMPTY_TEXT,
  emptyDefault: "no named nodes to draw",
  stated: {},
};

const TREE_STATUS_TONES: Readonly<Record<string, ToolRowTone>> = {
  invalid: "bad",
  empty: "warn",
};

const TREE_STATUS_ICONS: Readonly<Record<string, IconName>> = {
  invalid: "error",
  empty: "warning",
};

const TREE_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  unnamed: "destructive",
};

/** How many roots the header names before it says how many more there are. */
const HEAD_ROOTS = 3;

export function isTreeTool(name: string): boolean {
  return name.toLowerCase() === TREE_RENDER_TOOL;
}

/** The tool header: what stands at the top of the tree — the counts are the chips' job. */
/**
 * What the tree was built from: how many nodes, folders and leaves it holds, how
 * deep it goes and how many branches were cut. They are the call's own figures, so
 * they ride its header; the body is the tree.
 */
export function treeChipsOf(item: ToolTranscriptItem): readonly ToolRowCell[] {
  const view = treeToolViewOf(item.name, item.args, item.details, item.status);
  return view === null ? [] : view.cells;
}

export const treeToolPreviewOf = (item: ToolTranscriptItem): string =>
  toolPreviewLine(
    item,
    treeToolViewOf(item.name, item.args, item.details, item.status),
    TREE_WORDS,
    headOf,
  );

function headOf(_tool: string, view: TreeToolView): string {
  const { tree } = view;
  // The refusal is said once, in the header: a tree that was never drawn leaves the
  // row nothing else that could carry the sentence, and the body's work is to name
  // the nodes that carry no name.
  if (tree.status === "invalid") return treeFailureLine(tree);

  const roots = tree.nodes.map((node) => node.name);
  const named = roots.slice(0, HEAD_ROOTS).join(", ");
  const rest = roots.length - HEAD_ROOTS;
  // What the tree cut is one of the call's counts, so it rides the header with the
  // roots: the card is the tree, and nothing under it tallies it.
  return headerLineOf(
    [
      roots.length === 0 || rest <= 0 ? named : `${named} +${String(rest)}`,
      // The line the call gives the tree is a line about the call: it belongs on the
      // header, not under the tree it describes.
      tree.caption,
    ]
      .filter((part) => part !== "")
      .join(" · "),
    [
      tree.omitted === 0
        ? ""
        : `… ${counted(tree.omitted, "subtree")} not drawn`,
    ],
  );
}

/** The nodes a refusal could not name: where each hangs, and what was written there. */
function badRows(view: TreeToolView): ToolPaintRow[] {
  return view.tree.bad.map((bad, index) => ({
    key: `n-${String(index)}`,
    id: `n-${String(index)}`,
    primary: bad.under === "" ? "(the root)" : bad.under,
    secondary: `${bad.value === "" ? "(nothing)" : bad.value} where a name belongs`,
    badge: "unnamed",
    tone: "bad" as ToolRowTone,
  }));
}

export interface TreeToolRowsProps {
  item: ToolTranscriptItem;
}

export function TreeToolRows({ item }: TreeToolRowsProps): JSX.Element {
  const t = useAdwaita();

  if (item.status === "running") {
    return (
      <ToolRunning
        text={
          RUNNING_TEXT[item.name.toLowerCase()] ??
          RUNNING_TEXT[TREE_RENDER_TOOL]
        }
      />
    );
  }

  const view = treeToolViewOf(item.name, item.args, item.details, item.status);
  if (view === null) return <ToolUnknownResult item={item} tool={item.name} />;

  const { tree } = view;

  return (
    <div style={toolBodyStack(t)}>
      {tree.status === "ok" ? (
        <FileTree
          items={fileTreeOf(tree.nodes)}
          variant="list"
          defaultExpandedPaths={tree.expanded}
          style={{ width: "100%", minWidth: 0 }}
        />
      ) : null}

      {
        // Not the refusal again — the header says it — but the nodes that caused it,
        // each one shown where it hangs and with what was written in its place.
        tree.status === "invalid" ? (
          <ToolRowList
            rows={badRows(view)}
            variants={TREE_BADGE_VARIANTS}
            pressable={false}
          />
        ) : null
      }

      <ToolStatusNote
        status={view.status}
        note={
          tree.status === "ok" || tree.status === "invalid" ? "" : tree.error
        }
        tones={TREE_STATUS_TONES}
        icons={TREE_STATUS_ICONS}
      />
    </div>
  );
}
