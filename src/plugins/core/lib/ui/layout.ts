import type { StyleDesc } from "@gpuix/react";

const flex = (
  flexDirection: string,
  gap: number,
  extra?: Partial<StyleDesc>,
): StyleDesc => ({
  display: "flex",
  flexDirection,
  gap,
  minWidth: 0,
  ...extra,
});

export const column = (gap: number, extra?: Partial<StyleDesc>): StyleDesc =>
  flex("column", gap, extra);

export const row = (gap: number, extra?: Partial<StyleDesc>): StyleDesc =>
  flex("row", gap, extra);

export const centerRow = (gap: number, extra?: Partial<StyleDesc>): StyleDesc =>
  flex("row", gap, { alignItems: "center", ...extra });

export const ellipsis = (extra?: Partial<StyleDesc>): StyleDesc => ({
  minWidth: 0,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
  ...extra,
});

export const ellipsisFill = (extra?: Partial<StyleDesc>): StyleDesc =>
  ellipsis({ flexGrow: 1, flexShrink: 100, ...extra });
