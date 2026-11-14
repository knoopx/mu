/**
 * What the two repo panels say under themselves.
 *
 * The line is the panel's own count of what it holds and where the cursor stands —
 * how many changes in which revset, whose change is under the cursor, how many of
 * its files are checked; how many operations, which one, how old it is. The hints
 * are the pane's, because the keys of the change stack and the keys of its file
 * list are different sets and only the panel knows which half has the cursor.
 */

import type { ComposerPanelStatusSpec } from "../../core/components/composer/Composer";
import { SHORT_OP_ID } from "../constants";
import type { ChangesPanelState } from "../hooks/useChangesPanel";
import type { OplogPanelState } from "../hooks/useOplogPanel";
import {
  FILES_HINTS,
  OPLOG_FILE_HINTS,
  OPLOG_HINTS,
  STACK_HINTS,
} from "./shortcuts";
import { operationAge } from "./rowText";

export function changesStatus(
  changes: ChangesPanelState,
): ComposerPanelStatusSpec {
  const change = changes.rows[changes.sel];
  const files = `${changes.files.length} files`;
  const selected =
    changes.checked.size > 0 ? ` · ${changes.checked.size} selected` : "";
  const at =
    change === undefined
      ? ""
      : ` · ${change.change_id.slice(0, 8)} · ${change.author}`;
  return {
    message:
      `${changes.rows.length} changes in ${changes.currentRevset}${at}` +
      ` · ${files}${selected}`,
    hints: changes.focus === "stack" ? STACK_HINTS : FILES_HINTS,
  };
}

export function oplogStatus(oplog: OplogPanelState): ComposerPanelStatusSpec {
  const operation = oplog.rows[oplog.sel];
  const files = `${oplog.files.length} files`;
  const at =
    operation === undefined
      ? ""
      : ` · ${operation.op.slice(0, SHORT_OP_ID)} · ${operationAge(operation.time)}`;
  return {
    message: `${oplog.rows.length} operations${at} · ${files}`,
    hints: oplog.focus === "stack" ? OPLOG_HINTS : OPLOG_FILE_HINTS,
  };
}
