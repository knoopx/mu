/**
 * The file rows of a vcs panel's right half.
 *
 * A change's files and an operation's files are the same row — a path, what
 * happened to it, how many lines moved, and how big that move is against every
 * other file of the same thing — so one component draws both lists and the two
 * panels only choose the empty words above them.
 */
import type { JSX } from "react";
import { useAdwaita, DiffHistogram, DiffStats, fileRowStats, type FileChange } from "adwaita-gpuix";
import type { PublicInstance } from "@gpuix/react";
import { figureGap } from "../../core/lib/ui/tokens";
import { ComposerOptionRow } from "../../core/components/composer/rows";
import { iconForFile } from "../../core/lib/files/fileIcons";
import { usePanelChrome } from "../../core/lib/composer/chrome";
import { PanelList } from "./PanelList";
import { PANEL_FILE_ROWS } from "../constants";

export interface FilePaneProps {
  /** the panel's own cap is applied before this is called */
  files: readonly FileChange[];

  fileSel: number;

  /** whether the right half of the panel holds the cursor */
  focused: boolean;

  listRef: { current: PublicInstance | null };

  onSelect(index: number): void;
}

export function FilePane({
  files,
  fileSel,
  focused,
  listRef,
  onSelect,
}: FilePaneProps): JSX.Element {
  const t = useAdwaita();
  const s = usePanelChrome();
  const stats = fileRowStats([...files]);

  return (
    <div style={s.rowList(Math.min(files.length, PANEL_FILE_ROWS))}>
      <PanelList
        rows={files}
        sel={fileSel}
        listRef={listRef}
        rowKey={(entry, index) => `${entry.path}-${index}`}
        rowOf={(entry, i) => (
          <ComposerOptionRow
            label={entry.path}
            icon={iconForFile(entry.path)}
            trailing={
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: figureGap(t),
                  flexShrink: 0,
                }}
              >
                <DiffStats
                  insertions={entry.insertions}
                  deletions={entry.deletions}
                  stats={stats}
                />
                <DiffHistogram
                  insertions={entry.insertions}
                  deletions={entry.deletions}
                />
              </div>
            }
            picked={false}
            active={i === fileSel}
            focused={focused}
            onClick={() => onSelect(i)}
            onHover={() => onSelect(i)}
          />
        )}
      />
    </div>
  );
}
