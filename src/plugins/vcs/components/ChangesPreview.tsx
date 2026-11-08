/**
 * The changes panel's preview pane: what one file of a change is shown as.
 *
 * The patch of a text file is handed to the diff widget, which paints its
 * additions and deletions as tinted rows; the two sides of a table are handed
 * to the table widget, which lines the rows up against each other; the two
 * pictures of an image change are painted side by side, since no patch says
 * what changed in a picture.
 */
import { useMemo, type JSX } from "react";
import type { PublicInstance } from "@gpuix/react";
import { formatSize } from "@earendil-works/pi-coding-agent";
import {
  DiffPanel,
  T,
  useAdwaita,
  type AdwaitaTheme,
  type FileChange,
  type TabularSides,
} from "adwaita-gpuix";
import { mutedText } from "../../core/lib/ui/theme";
import type { StyleDesc } from "@gpuix/react";
import { filePreviewOf } from "../lib/preview";
import type { ChangeImage } from "../hooks/useChangeFiles";

type FileStatus = FileChange["status"];

function PaneCaption({ text }: { text: string }): JSX.Element {
  const t = useAdwaita();
  return (
    <T size="caption" color={mutedText(t)}>
      {text}
    </T>
  );
}

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
    gap: t.space.xs,
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 0,
    minWidth: 0,
  };
}

/** One picture with the side of the change it is, and how big it is. */
function ImageTile({
  label,
  src,
  bytes,
  alt,
}: {
  label: string;
  src: string;
  bytes: number;
  alt: string;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={tileStyle(t)}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: t.space.sm,
          flexShrink: 0,
        }}
      >
        <T size="caption" weight={t.type.weight.semibold} color={mutedText(t)}>
          {label}
        </T>
        {bytes > 0 ? (
          <T size="caption" color={mutedText(t)}>
            {formatSize(bytes)}
          </T>
        ) : null}
      </div>
      {src === "" ? (
        <PreviewNote text="no picture on this side" />
      ) : (
        <img
          src={src}
          alt={alt}
          objectFit="contain"
          style={{
            width: "100%",
            flexGrow: 1,
            minHeight: 0,
            borderWidth: 0,
          }}
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
  const showsBefore = status !== "A";
  const showsAfter = status !== "D";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: t.space.md,
        flexGrow: 1,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {showsBefore ? (
        <ImageTile
          label="before"
          src={image.before}
          bytes={image.beforeBytes}
          alt={`${image.path} before`}
        />
      ) : null}
      {showsAfter ? (
        <ImageTile
          label="after"
          src={image.after}
          bytes={image.afterBytes}
          alt={`${image.path} after`}
        />
      ) : null}
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
  return <DiffPanel patch={patch} diffRef={diffRef} />;
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
    <DiffPanel
      patch={patch}
      tabular={tabular}
      diffRef={diffRef}
      name={path}
    />
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
