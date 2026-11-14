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
import type { FilePanelFocus } from "../types";

/**
 * What a panel's right half reads out of its own state.
 *
 * The change stack and the operation log keep this part of their state in the
 * same shape — the files of the picked row, where the cursor stands, that file's
 * patch — so a panel hands its state over whole instead of unpacking nine props
 * at the call, which is the half of the panel that used to be written twice.
 */
export interface PanelFileState {
  files: readonly FileChange[];
  fileSel: number;

  /** whether this half of the panel holds the cursor */
  focus: FilePanelFocus;

  fileListRef: { current: PublicInstance | null };

  diffRef: { current: PublicInstance | null };

  /** the patch of the file the cursor is on */
  patch: string;

  selectFile(index: number): void;
}

export interface FilePreviewPaneProps {
  state: PanelFileState;

  /** the two pictures of an image change, where there is a pair to paint */
  image: ChangeImage | null;

  emptyText: string;
}

export function FilePreviewPane({
  state,
  image,
  emptyText,
}: FilePreviewPaneProps): JSX.Element {
  const s = usePanelChrome();
  const capped = state.files.slice(0, PANEL_LIST_CAP);
  const file = state.files[state.fileSel];

  return (
    <div style={s.widePane}>
      {capped.length === 0 ? (
        <PaneEmpty text={emptyText} style={s.emptyPane} />
      ) : (
        <>
          <FilePane
            files={capped}
            fileSel={state.fileSel}
            focused={state.focus === "files"}
            listRef={state.fileListRef}
            onSelect={state.selectFile}
          />
          <div style={s.paneRuleH} />
          <div style={s.previewPane}>
            <ChangesPreview
              path={file?.path ?? ""}
              status={file?.status ?? ""}
              patch={state.patch}
              image={image}
              diffRef={state.diffRef}
            />
          </div>
        </>
      )}
    </div>
  );
}
