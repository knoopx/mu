/**
 * The changes panel's preview pane: what one file of a change is shown as.
 *
 * The patch of a text file is read into rows and drawn as one line each, tinted
 * by what happened to it and coloured by what its text is made of; the two sides
 * of a table are handed to the table widget, which lines the rows up against
 * each other; the two pictures of an image change are painted side by side,
 * since no patch says what changed in a picture.
 *
 * The diff widget is asked for no file header of its own: the preview pane
 * shows one file at a time and that file is already named, picked, in the file
 * list above it, so a header row would only spend a row saying which file the
 * row it sits over belongs to.
 */
import { useMemo, type JSX } from "react";
import type { PublicInstance } from "@gpuix/react";
import { formatSize } from "@earendil-works/pi-coding-agent";
import {
  DiffPanel,
  T,
  diffRowsOf,
  useAdwaita,
  type AdwaitaTheme,
  type FileChange,
  type TabularSides,
} from "adwaita-gpuix";
import { mutedText } from "../../core/lib/ui/theme";
import { emphasisWeight, figureGap } from "../../core/lib/ui/tokens";
import { paneGap, panelGap } from "../../core/lib/composer/chrome";
import type { StyleDesc } from "@gpuix/react";
import { useDiffTokens } from "../../core/hooks/useDiffTokens";
import { ZoomImage } from "../../core/components/ZoomImage";
import type { ViewerPicture } from "../../core/lib/ui/imageViewer";
import { filePreviewOf } from "../lib/preview";
import { PaneCaption } from "./PaneCaption";
import type { ChangeImage } from "../hooks/useChangeFiles";

type FileStatus = FileChange["status"];

function PreviewNote({ text }: { text: string }): JSX.Element {
  const t = useAdwaita();
  return (
    <div
      style={{
        display: "flex",
        flexGrow: 1,
        minHeight: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <PaneCaption text={text} />
    </div>
  );
}

function tileStyle(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: panelGap(t),
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 0,
    minWidth: 0,
  };
}

/** The corner mark a change's picture wears when the cursor is over it. */
const PICTURE_BADGE = 24;

/**
 * One side of an image change: the word the pane prints above it, the pixels it
 * holds, and the picture the viewer is handed when it is clicked over.
 */
interface ChangeSide {
  label: string;
  src: string;
  bytes: number;
  picture: ViewerPicture;
}

function sideOf(
  path: string,
  label: string,
  src: string,
  bytes: number,
): ChangeSide {
  return {
    label,
    src,
    bytes,
    picture: { src, title: path, detail: `${label} · ${formatSize(bytes)}` },
  };
}

/** One picture with the side of the change it is, and how big it is. */
function ImageTile({
  side,
  group,
  at,
}: {
  side: ChangeSide;
  group: readonly ViewerPicture[];
  at: number;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={tileStyle(t)}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: figureGap(t),
          flexShrink: 0,
        }}
      >
        <T size="caption" weight={emphasisWeight(t)} color={mutedText(t)}>
          {side.label}
        </T>
        {side.bytes > 0 ? (
          <T size="caption" color={mutedText(t)}>
            {formatSize(side.bytes)}
          </T>
        ) : null}
      </div>
      {side.src === "" ? (
        <PreviewNote text="no picture on this side" />
      ) : (
        <ZoomImage
          src={side.src}
          title={side.picture.title}
          detail={side.picture.detail}
          group={group}
          at={at}
          box={{ width: "100%", flexGrow: 1, minHeight: 0 }}
          badge={PICTURE_BADGE}
        />
      )}
    </div>
  );
}

/** The before and the after of an image change, as two tiles. */
function ImageSides({
  image,
  status,
}: {
  image: ChangeImage;
  status: FileStatus | "";
}): JSX.Element {
  const t = useAdwaita();

  // The two sides are one group: the arrows walk from what the picture was to
  // what it became, which is the pair the change is about. A change that only
  // added or only removed the file has one side, and its arrows are inert.
  const sides: ChangeSide[] = [
    ...(status !== "A"
      ? [sideOf(image.path, "before", image.before, image.beforeBytes)]
      : []),
    ...(status !== "D"
      ? [sideOf(image.path, "after", image.after, image.afterBytes)]
      : []),
  ];
  const group = sides.map((side) => side.picture);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: paneGap(t),
        flexGrow: 1,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {sides.map((side, i) => (
        <ImageTile key={side.label} side={side} group={group} at={i} />
      ))}
    </div>
  );
}

/**
 * The two widgets DiffPanel is: the diff of a file's lines, and the two tables
 * of a table file lined up. They are drawn by two components on purpose —
 * DiffPanel returns its table branch before its last hook, so one instance
 * asked to switch between them would render a different number of hooks.
 */
function TextDiff({
  patch,
  diffRef,
}: {
  patch: string;

  diffRef: { current: PublicInstance | null };
}): JSX.Element {
  const rows = useMemo(() => diffRowsOf(patch), [patch]);
  const tokenize = useDiffTokens(rows);
  return (
    <DiffPanel
      patch={patch}
      rows={rows}
      tokenize={tokenize}
      diffRef={diffRef}
      fileHeader={false}
    />
  );
}

function TableDiff({
  path,
  patch,
  tabular,
  diffRef,
}: {
  path: string;

  patch: string;

  tabular: TabularSides;

  diffRef: { current: PublicInstance | null };
}): JSX.Element {
  return (
    <DiffPanel patch={patch} tabular={tabular} diffRef={diffRef} name={path} />
  );
}

export function ChangesPreview({
  path,
  status,
  patch,
  image,
  diffRef,
}: {
  path: string;

  status: FileStatus | "";

  patch: string;

  image: ChangeImage | null;

  diffRef: { current: PublicInstance | null };
}): JSX.Element {
  const preview = useMemo(() => filePreviewOf(path, patch), [path, patch]);

  if (preview.kind === "image") {
    if (image === null || image.path !== path)
      return <PreviewNote text="No picture to show for this file" />;
    if (image.loading) return <PreviewNote text="Reading this picture…" />;
    if (image.before === "" && image.after === "")
      return <PreviewNote text="No picture to show for this file" />;
    return <ImageSides image={image} status={status} />;
  }

  if (preview.kind === "binary")
    return <PreviewNote text="A binary file: no lines to diff" />;

  if (preview.kind === "none")
    return <PreviewNote text="No diff for this file" />;

  if (preview.kind === "tabular" && preview.tabular !== null)
    return (
      <TableDiff
        path={path}
        patch={patch}
        tabular={preview.tabular}
        diffRef={diffRef}
      />
    );

  return <TextDiff patch={patch} diffRef={diffRef} />;
}
