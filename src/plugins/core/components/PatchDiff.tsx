import { useMemo, type JSX } from "react";
import { ToolDiff, diffRowsOf } from "adwaita-gpuix";
import { useDiffTokens } from "../hooks/useDiffTokens";

/**
 * A patch shown in the log, read as the code it is.
 *
 * The rows are parsed once here and handed to both the widget and the reader,
 * because the reader's answer is keyed to those rows: a row's colour comes back
 * to the row it was cut from.
 */
export function PatchDiff({
  patch,
  fileHeader = false,
}: {
  patch: string;
  fileHeader?: boolean;
}): JSX.Element {
  const rows = useMemo(() => diffRowsOf(patch), [patch]);
  const tokenize = useDiffTokens(rows);
  return (
    <ToolDiff
      patch={patch}
      rows={rows}
      tokenize={tokenize}
      fileHeader={fileHeader}
    />
  );
}
