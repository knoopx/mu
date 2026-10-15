import { useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

export interface PanelChrome {
  column: StyleDesc;
  fillColumn: StyleDesc;
  splitRow: StyleDesc;
  listPane: (width?: number) => StyleDesc;
  widePane: StyleDesc;
  previewPane: StyleDesc;
  previewCode: StyleDesc;
  paneRule: StyleDesc;
  paneRuleH: StyleDesc;
  rowList: (rows: number) => StyleDesc;
  listBlock: StyleDesc;
  statusBar: StyleDesc;
  emptyPane: StyleDesc;
}

export function panelChrome(t: AdwaitaTheme): PanelChrome {
  const column: StyleDesc = { display: "flex", flexDirection: "column" };
  return {
    column,
    fillColumn: { ...column, flexGrow: 1, minHeight: 0 },
    splitRow: {
      display: "flex",
      flexDirection: "row",
      gap: t.space.md,
      flexGrow: 1,
      minHeight: 0,
    },
    listPane(width = t.control.sidebarWidth): StyleDesc {
      return { ...column, width, flexShrink: 0 };
    },
    widePane: {
      ...column,
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 0,
      minWidth: 0,
    },
    previewPane: {
      ...column,
      flexGrow: 1,
      flexBasis: 0,
      minWidth: 0,
      minHeight: 0,
    },
    previewCode: {
      flexGrow: 1,
      minHeight: 0,
      overflow: "hidden",
      fontSize: t.type.caption,
      fontFamily: t.type.fontFamilyMono,
      color: t.color.text.primary,
    },
    paneRule: {
      width: t.control.dividerThickness,
      alignSelf: "stretch",
      flexShrink: 0,
      backgroundColor: t.color.divider.default,
      pointerEvents: "none",
    },
    statusBar: {
      flexShrink: 0,
      height: t.control.statusBarHeight,
      paddingLeft: 0,
      paddingRight: 0,
      backgroundColor: "transparent",
    },
    paneRuleH: {
      height: t.control.dividerThickness,
      alignSelf: "stretch",
      flexShrink: 0,
      marginTop: t.space.md,
      marginBottom: t.space.md,
      backgroundColor: t.color.divider.default,
      pointerEvents: "none",
    },

    rowList(rows: number): StyleDesc {
      return {
        ...column,
        flexShrink: 0,
        height: rows * t.control.rowHeight,
        minHeight: 0,
        overflow: "hidden",
      };
    },
    listBlock: { ...column, flexGrow: 1, minHeight: 0 },
    emptyPane: {
      display: "flex",
      flexGrow: 1,
      minHeight: 0,
      alignItems: "center",
      justifyContent: "center",
    },
  };
}

export function usePanelChrome(): PanelChrome {
  return panelChrome(useAdwaita());
}
