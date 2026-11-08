/**
 * The right half of a vcs panel: the files of the picked row, and one of them
 * drawn underneath.
 *
 * A change and an operation both answer with files and a patch, so the half is
 * one component and the panels only choose the words it says when there are
 * none, and whether it has the two pictures of an image to paint (a change
 * does, an operation's whole-repo snapshot does not).
 */
import type { JSX } from "react";
import type { PublicInstance } from "@gpuix/react";
import type { FileChange } from "adwaita-gpuix";
import { usePanelChrome } from "../../core/lib/composer/chrome";
import { ChangesPreview } from "./ChangesPreview";
import { FilePane } from "./FilePane";
import { PaneEmpty } from "./PaneEmpty";
import { PANEL_LIST_CAP } from "../constants";
import type { ChangeImage } from "../hooks/useChangeFiles";

export interface FilePreviewPaneProps {
  files: readonly FileChange[];

  fileSel: number;

  /** whether this half of the panel holds the cursor */
  focused: boolean;

  fileListRef: { current: PublicInstance | null };

  diffRef: { current: PublicInstance | null };

  onSelect(index: number): void;

  /** the patch of the file the cursor is on */
  patch: string;

  /** the two pictures of an image change, where there is a pair to paint */
  image: ChangeImage | null;

  emptyText: string;
}

export function FilePreviewPane({
  files,
  fileSel,
  focused,
  fileListRef,
  diffRef,
  onSelect,
  patch,
  image,
  emptyText,
}: FilePreviewPaneProps): JSX.Element {
  const s = usePanelChrome();
  const capped = files.slice(0, PANEL_LIST_CAP);
  const file = files[fileSel];

  return (
    <div style={s.widePane}>
      {capped.length === 0 ? (
        <PaneEmpty text={emptyText} style={s.emptyPane} />
      ) : (
        <>
          <FilePane
            files={capped}
            fileSel={fileSel}
            focused={focused}
            listRef={fileListRef}
            onSelect={onSelect}
          />
          <div style={s.paneRuleH} />
          <div style={s.previewPane}>
            <ChangesPreview
              path={file?.path ?? ""}
              status={file?.status ?? ""}
              patch={patch}
              image={image}
              diffRef={diffRef}
            />
          </div>
        </>
      )}
    </div>
  );
}
