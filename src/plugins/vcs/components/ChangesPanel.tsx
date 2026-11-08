import { useEffect, type JSX } from "react";
import { useGpuixRequired, type StyleDesc } from "@gpuix/react";
import {
  DiffHistogram,
  DiffStats,
  T,
  fileRowStats,
  useAdwaita,
  useListFollow,
  useListWindow,
  VirtualListPanel,
} from "adwaita-gpuix";
import { mutedText } from "../../core/lib/ui/theme";
import { ROW_HEIGHT } from "../../core/lib/ui/tokens";
import { ComposerOptionRow } from "../../core/components/composer/rows";
import { iconForFile } from "../../core/lib/composer/options";
import { relativeAge } from "../../core/lib/utils/time";
import { usePanelChrome } from "../../core/lib/composer/chrome";
import { ChangesPreview } from "./ChangesPreview";
import type { ChangesPanelState } from "../hooks/useChangesPanel";

const LIST_CAP = 200;

export const FILES_ROWS = 6;

const ROW_SLOT: StyleDesc = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  flexShrink: 0,
};

function firstLine(text: string): string {
  const line = text.split("\n")[0] ?? "";
  return line.length === 0 ? "(no description)" : line;
}

function PaneCaption({ text }: { text: string }): JSX.Element {
  const t = useAdwaita();
  return (
    <T size="caption" color={mutedText(t)}>
      {text}
    </T>
  );
}

function PaneEmpty({
  text,
  style,
}: {
  text: string;
  style: StyleDesc;
}): JSX.Element {
  return (
    <div style={style}>
      <PaneCaption text={text} />
    </div>
  );
}

export function ChangesPanel({
  panel,
}: {
  panel: ChangesPanelState;
}): JSX.Element {
  const t = useAdwaita();
  const s = usePanelChrome();
  const renderer = useGpuixRequired();
  const rowHeight = ROW_HEIGHT;
  const stack = panel.rows.slice(0, LIST_CAP);
  const files = panel.files.slice(0, LIST_CAP);
  const file = panel.files[panel.fileSel];
  const stats = fileRowStats(files);
  const stackWin = useListWindow(stack.length, rowHeight);
  const filesWin = useListWindow(files.length, rowHeight);
  const fileRows = Math.min(files.length, FILES_ROWS);
  const followStack = useListFollow(panel.stackListRef, renderer, rowHeight);
  const followFiles = useListFollow(panel.fileListRef, renderer, rowHeight);

  useEffect(() => {
    followStack(panel.sel);
  }, [panel.sel, followStack]);

  useEffect(() => {
    followFiles(panel.fileSel);
  }, [panel.fileSel, followFiles]);

  return (
    <div style={s.splitRow}>
      <div style={s.listPane()}>
        {panel.error !== null ? (
          <PaneEmpty text={panel.error} style={s.emptyPane} />
        ) : stack.length === 0 ? (
          <PaneEmpty text="No changes in this revset" style={s.emptyPane} />
        ) : (
          <VirtualListPanel
            bare
            listRef={panel.stackListRef}
            estimatedItemHeight={rowHeight}
            itemCount={stackWin.itemCount}
            windowStart={stackWin.windowStart}
            overdraw={stackWin.overdraw}
            onVisibleRange={stackWin.onVisibleRange}
          >
            {stackWin.slice(stack).map((entry, off) => {
              const i = stackWin.at(off);
              return (
                <div key={entry.change_id} style={ROW_SLOT}>
                  <ComposerOptionRow
                    label={firstLine(entry.description)}
                    description={relativeAge(entry.timestamp)}
                    tabular
                    picked={entry.change_id === panel.currentId}
                    active={i === panel.sel}
                    focused={panel.focus === "stack"}
                    onClick={() => panel.selectChange(i)}
                    onHover={() => panel.selectChange(i)}
                  />
                </div>
              );
            })}
          </VirtualListPanel>
        )}
      </div>
      <div style={s.paneRule} />
      <div style={s.widePane}>
        {files.length === 0 ? (
          <PaneEmpty text="No files in this change" style={s.emptyPane} />
        ) : (
          <>
            <div style={s.rowList(fileRows)}>
              <VirtualListPanel
                bare
                listRef={panel.fileListRef}
                estimatedItemHeight={rowHeight}
                itemCount={filesWin.itemCount}
                windowStart={filesWin.windowStart}
                overdraw={filesWin.overdraw}
                onVisibleRange={filesWin.onVisibleRange}
              >
                {filesWin.slice(files).map((entry, off) => {
                  const i = filesWin.at(off);
                  return (
                    <div key={`${entry.path}-${i}`} style={ROW_SLOT}>
                      <ComposerOptionRow
                        label={entry.path}
                        icon={iconForFile(entry.path)}
                        trailing={
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: t.space.sm,
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
                        active={i === panel.fileSel}
                        focused={panel.focus === "files"}
                        onClick={() => panel.selectFile(i)}
                        onHover={() => panel.selectFile(i)}
                      />
                    </div>
                  );
                })}
              </VirtualListPanel>
            </div>
            <div style={s.paneRuleH} />
            <div style={s.previewPane}>
              <ChangesPreview
                path={file?.path ?? ""}
                status={file?.status ?? ""}
                patch={panel.patch}
                image={panel.image}
                diffRef={panel.diffRef}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
