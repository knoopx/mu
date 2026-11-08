import { useEffect, useRef, type JSX, type ReactNode } from "react";
import {
  StatusBar,
  T,
  isRenderableImage,
  useAdwaita,
  type AdwaitaTheme,
  type IconName,
} from "adwaita-gpuix";
import type { EventPayload } from "@gpuix/native";
import {
  useGpuixRequired,
  type NativeRenderer,
  type PublicInstance,
  type StyleDesc,
} from "@gpuix/react";

import {
  buildNativeTheme,
  composerFill,
  mutedText,
  type ComposerTone,
} from "../../lib/ui/theme";
import { addInputListener } from "../../../../window/window";
import { truncateToWidth } from "../../../../utils/truncate";
import { CODE_LINE_HEIGHT } from "../../lib/composer/panelHeight";
import {
  composerFieldRows,
  composerFieldSize,
  draftIsBlank,
  fieldLineBox,
  fieldPadY,
  FIELD_MAX_ROWS,
  fitsOneRow,
} from "../../lib/composer/fieldRows";
import {
  composerFieldKey,
  composerGlobalKey,
  composerListKey,
  type ComposerKeyContext,
} from "../../lib/composer/keyRouter";
import {
  isPanelMode,
  panelIndex,
  transition,
  windowRows,
  type ComposerEvent,
  type ComposerMode,
} from "../../lib/composer/mode";
import {
  CONTEXT_RING_WIDTH,
  ComposerPill,
  PILL_HEIGHT,
  contextFraction,
  contextRingGradient,
} from "./pills";
import {
  ComposerCommandRow,
  ComposerOptionRow,
  ComposerStatus,
  ComposerThemeRow,
} from "./rows";
import { type Shortcut } from "../../lib/composer/shortcuts";
import { useComposerKeys } from "../../hooks/useComposerKeys";
import { resolve } from "node:path";

export type ComposerPanelRow =
  | {
      kind: "command";
      key: string;
      name: string;
      args?: string;
      description?: string;
      icon?: IconName;
    }
  | {
      kind: "option";
      key: string;
      label: string;
      caption?: string;
      description?: string;
      figures?: ComposerRowFigure[];
      tabular?: boolean;
      picked?: boolean;
      icon?: IconName;
    }
  | {
      kind: "theme";
      key: string;
      label: string;
      swatch: ComposerSwatchSpec;
    };

export interface ComposerRowFigure {
  icon?: IconName;

  
  color?: string;
  text: string;

  width?: number;
}

export interface ComposerSwatchSpec {
  window: string;
  surface: string;
  text: string;
}

export interface ComposerPreviewSpec {
  path: string;
  lines: string[];

  
  note?: string;
}

export interface ComposerPanelStatusSpec {
  message?: string;
  hints?: Shortcut[];
}

export interface ComposerPanelSpec {
  rows: ComposerPanelRow[];

  placeholder?: string;
  preview?: ComposerPreviewSpec;
  busy?: boolean;

  busyText?: string;
  error?: string;
  emptyText?: string;

  wide?: {
    node: ReactNode;
    onKey?: (event: EventPayload) => boolean;
    height: number;
  };

  height?: number;

  maxVisible?: number;

  status?: ComposerPanelStatusSpec;
  onPick: (row: ComposerPanelRow) => void;
  onHover: (index: number) => void;

  onDelete?: (row: ComposerPanelRow) => void;
}

export interface ComposerContextSpec {
  used: number;

  total: number;
}

export interface ComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;

  model?: string | null;

  thinking?: string | null;

  context?: ComposerContextSpec | null;

  mode: ComposerMode;
  onMode: (mode: ComposerMode) => void;

  panel?: ComposerPanelSpec;

  isStreaming: boolean;
  onAbort: () => void;

  onPaste?: () => void;

  onClear?: () => void;

  onHistory?: () => void;

  
  onComplete?: () => void;

  tone?: ComposerTone;

  placeholder?: string;
  style?: Partial<StyleDesc>;
}

const META_LABEL_MAX_WIDTH = 420;
const META_LABEL_MAX_CHARS = 64;
const DEFAULT_MAX_VISIBLE = 8;

function previewLinesOf(
  preview: ComposerPreviewSpec | undefined,
  maxHeightPx: number,
): string[] {
  if (preview === undefined) return [];
  const hasContent = preview.lines.some((line) => line.trim() !== "");
  if (!hasContent) return [];
  return preview.lines.slice(
    0,
    Math.max(1, Math.floor(maxHeightPx / CODE_LINE_HEIGHT)),
  );
}

interface ComposerStyles {
  root: StyleDesc;
  box: StyleDesc;
  fieldRow: StyleDesc;
  metaSlot: StyleDesc;
  metaLabelSlot: StyleDesc;
  metaLabel: StyleDesc;
  column: StyleDesc;
  splitRow: StyleDesc;
  fillColumn: StyleDesc;
  listPane: StyleDesc;
  widePane: StyleDesc;
  statusBar: StyleDesc;
  paneRule: StyleDesc;
  previewPane: StyleDesc;
  previewCode: StyleDesc;
  field: StyleDesc;
  fieldOneRow: StyleDesc;
}

function composerStyles(
  t: AdwaitaTheme,
  tone: ComposerTone,
  extra?: Partial<StyleDesc>,
  framed = false,
  panelHeight?: number,
  ringFraction: number | null = null,
): ComposerStyles {
  const column: StyleDesc = { display: "flex", flexDirection: "column" };
  const rowHeight = t.control.rowHeight;
  const ring = ringFraction !== null;
  const ringWidth = ring ? CONTEXT_RING_WIDTH : 0;

  const fieldPad = fieldPadY(t);
  const lineBox = fieldLineBox(t);
  const field: StyleDesc = {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    lineHeight: lineBox,
    paddingLeft: t.space.xs,
    fontSize: composerFieldSize(t),
    fontFamily: t.type.fontFamily,
    color: t.color.text.primary,
    backgroundColor: "transparent",
    borderWidth: 0,
  };
  return {
    root: {
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      minWidth: 0,
      padding: ringWidth,
      position: "relative",
      borderRadius: t.radius.md + ringWidth,
      borderWidth: 0,
      overflow: "hidden",

      background: ring ? contextRingGradient(t, ringFraction) : "transparent",

      height: panelHeight,
      minHeight: panelHeight,
      ...extra,
    },

    box: {
      display: "flex",
      flexDirection: "column",
      flexGrow: 1,
      minHeight: 0,
      minWidth: 0,
      paddingLeft: framed ? 0 : t.space.lg,
      paddingRight: framed ? 0 : t.space.lg,
      paddingTop: framed ? 0 : t.space.sm,
      paddingBottom: framed ? 0 : t.space.sm,
      gap: framed ? 0 : t.space.xs,
      position: "relative",
      borderRadius: t.radius.md,
      borderWidth: 0,
      overflow: "hidden",

      backgroundColor: framed ? "transparent" : composerFill(t, tone),
    },
    fieldRow: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "nowrap",
      alignItems: "center",
      alignContent: "center",
      alignSelf: "stretch",
      gap: t.space.md,
      minHeight: rowHeight,
      minWidth: 0,
    },
    metaSlot: {
      display: "flex",
      flexDirection: "row",
      flexWrap: "nowrap",
      alignItems: "center",
      alignContent: "center",
      justifyContent: "flex-end",
      alignSelf: "center",
      gap: t.space.md,
      flexShrink: 1,
      minWidth: 0,
      pointerEvents: "none",
    },

    metaLabelSlot: {
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      height: PILL_HEIGHT,
      flexShrink: 1,
      minWidth: 0,
    },
    metaLabel: {
      fontSize: t.type.caption,
      lineHeight: PILL_HEIGHT,
      fontFamily: t.type.fontFamily,
      color: t.color.text.dim,
      whiteSpace: "nowrap",
      flexShrink: 1,
      minWidth: 0,
      maxWidth: META_LABEL_MAX_WIDTH,
      userSelect: "none",
    },
    column,
    fillColumn: {
      ...column,
      flexGrow: panelHeight === undefined ? 0 : 1,
      minHeight: 0,
    },
    splitRow: {
      display: "flex",
      flexDirection: "row",
      gap: t.space.md,
      flexGrow: panelHeight === undefined ? 0 : 1,
      minHeight: 0,
    },
    listPane: {
      ...column,
      width: t.control.sidebarWidth,
      flexShrink: 0,
    },
    statusBar: {
      flexShrink: 0,
      height: t.control.statusBarHeight,
      paddingLeft: 0,
      paddingRight: 0,
      backgroundColor: "transparent",
    },
    widePane: {
      ...column,
      flexGrow: 1,
      flexBasis: 0,
      minHeight: 0,
      minWidth: 0,
    },
    paneRule: {
      width: t.control.dividerThickness,
      alignSelf: "stretch",
      flexShrink: 0,
      backgroundColor: t.color.divider.default,
      pointerEvents: "none",
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
    field,
    fieldOneRow: {
      ...field,
      height: rowHeight,
      minHeight: rowHeight,
      paddingTop: fieldPad,
      paddingBottom: fieldPad,
    },
  };
}

interface RowWindow {
  visible: ComposerPanelRow[];
  start: number;
  end: number;
}

interface ComposerPanelProps {
  panel: ComposerPanelSpec;
  win: RowWindow;
  active: number;
  styles: ComposerStyles;
  previewLines: string[];
  onKeyDown: (event: EventPayload) => void;
  panelRef?: (node: PublicInstance | null) => void;
}

function PanelStatus({
  panel,
}: {
  panel: ComposerPanelSpec;
}): JSX.Element | null {
  if (panel.error !== undefined)
    return <ComposerStatus text={panel.error} destructive />;
  if (panel.busy === true)
    return (
      <ComposerStatus text={panel.busyText ?? panel.emptyText ?? "Loading…"} />
    );
  if (panel.rows.length === 0)
    return <ComposerStatus text={panel.emptyText ?? "No matches"} />;
  return null;
}

function PanelRow({
  row,
  active,
  checkColumn,
  onPick,
  onHover,
}: {
  row: ComposerPanelRow;
  active: boolean;
  checkColumn: boolean;
  onPick: () => void;
  onHover: () => void;
}): JSX.Element {
  if (row.kind === "theme")
    return (
      <ComposerThemeRow
        label={row.label}
        swatch={row.swatch}
        active={active}
        onClick={onPick}
        onHover={onHover}
      />
    );
  if (row.kind === "command")
    return (
      <ComposerCommandRow
        name={row.name}
        args={row.args}
        description={row.description}
        icon={row.icon}
        active={active}
        onClick={onPick}
        onHover={onHover}
      />
    );
  return (
    <ComposerOptionRow
      label={row.label}
      caption={row.caption}
      description={row.description}
      figures={row.figures}
      icon={row.icon}
      tabular={row.tabular === true}
      picked={row.picked === true}
      checkColumn={checkColumn}
      active={active}
      onClick={onPick}
      onHover={onHover}
    />
  );
}

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "ico",
  "tiff",
  "avif",
  "svg",
]);

function imageSourceOf(path: string): string | undefined {
  const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  const dot = name.lastIndexOf(".");
  if (dot < 0) return undefined;
  if (!IMAGE_EXTENSIONS.has(name.slice(dot + 1))) return undefined;
  return resolve(process.cwd(), path);
}

function PanelImagePreview({
  path,
  src,
  styles,
}: {
  path: string;
  src: string;
  styles: ComposerStyles;
}): JSX.Element | null {
  const t = useAdwaita();
  if (!isRenderableImage(src)) return null;
  return (
    <div
      style={{
        ...styles.previewPane,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <img
        src={src}
        alt={path}
        objectFit="contain"
        style={{
          width: "100%",
          height: "100%",
          borderRadius: t.radius.md,
        }}
      />
    </div>
  );
}

function PanelPreview({
  preview,
  lines,
  styles,
}: {
  preview: ComposerPreviewSpec;
  lines: string[];
  styles: ComposerStyles;
}): JSX.Element {
  const t = useAdwaita();
  const src = imageSourceOf(preview.path);
  if (src !== undefined)
    return <PanelImagePreview path={preview.path} src={src} styles={styles} />;
  
  if (lines.length === 0)
    return (
      <div style={styles.previewPane}>
        <T size="caption" color={mutedText(t)}>
          {preview.note ?? "No preview"}
        </T>
      </div>
    );
  return (
    <div style={styles.previewPane}>
      <code
        code={lines.join("\n")}
        path={preview.path}
        showLineNumbers
        theme={buildNativeTheme(t)}
        style={styles.previewCode}
      />
    </div>
  );
}

function ComposerPanel({
  panel,
  win,
  active,
  styles,
  previewLines,
  onKeyDown,
  panelRef,
}: ComposerPanelProps): JSX.Element {
  const checkColumn = panel.rows.some(
    (row) => row.kind === "option" && row.picked === true,
  );
  const split = panel.preview !== undefined;
  const wide = panel.wide;
  if (wide !== undefined)
    return (
      <div
        style={styles.fillColumn}
        tabIndex={0}
        onKeyDown={onKeyDown}
        ref={panelRef}
      >
        <div
          style={
            panel.height === undefined
              ? { ...styles.widePane, height: wide.height }
              : styles.widePane
          }
        >
          {wide.node}
        </div>
      </div>
    );

  return (
    <div
      style={split ? styles.splitRow : styles.fillColumn}
      tabIndex={0}
      onKeyDown={onKeyDown}
      ref={panelRef}
    >
      <div style={split ? styles.listPane : styles.column}>
        <PanelStatus panel={panel} />
        {panel.error === undefined &&
          panel.busy !== true &&
          win.visible.map((row, i) => {
            const index = win.start + i;
            return (
              <PanelRow
                key={row.key}
                row={row}
                active={index === active}
                checkColumn={checkColumn}
                onPick={() => panel.onPick(row)}
                onHover={() => panel.onHover(index)}
              />
            );
          })}
      </div>
      {split && <div style={styles.paneRule} />}
      {split && panel.preview !== undefined && (
        <PanelPreview
          preview={panel.preview}
          lines={previewLines}
          styles={styles}
        />
      )}
    </div>
  );
}

interface ComposerMetaProps {
  model?: string | null;
  thinking?: string | null;
  styles: ComposerStyles;
}

function ComposerMeta(props: ComposerMetaProps): JSX.Element | null {
  const model = props.model ?? "";
  const thinking = props.thinking ?? "";
  if (model.length === 0 && thinking.length === 0) return null;
  return (
    <div style={props.styles.metaSlot}>
      {model.length > 0 ? (
        <div style={props.styles.metaLabelSlot}>
          <text style={props.styles.metaLabel}>
            {truncateToWidth(model, META_LABEL_MAX_CHARS)}
          </text>
        </div>
      ) : null}
      {thinking.length > 0 ? <ComposerPill label={thinking} /> : null}
    </div>
  );
}

const rowUnderCursor = (
  panel: ComposerPanelSpec,
  mode: ComposerMode,
): ComposerPanelRow | undefined =>
  panel.rows[panelIndex(mode, panel.rows.length)];

function contextRingOf(
  panelOpen: boolean,
  context: ComposerContextSpec | null,
): number | null {
  if (panelOpen === true || context === null) return null;
  return context.total > 0
    ? contextFraction(context.used, context.total)
    : null;
}

function panelStateOf(
  mode: ComposerMode,
  panel: ComposerPanelSpec | undefined,
): { panelOpen: boolean; wideOpen: boolean } {
  const panelOpen = isPanelMode(mode) && panel !== undefined;
  return { panelOpen, wideOpen: panelOpen && panel?.wide !== undefined };
}

const fieldTextOf = (mode: ComposerMode, value: string): string =>
  mode.kind === "draft" ? value : mode.query;

const fieldPlaceholderOf = (
  panel: ComposerPanelSpec | undefined,
  fallback: string | undefined,
): string => panel?.placeholder ?? fallback ?? "Type a message";

function rowWindowOf(
  panel: ComposerPanelSpec | undefined,
  mode: ComposerMode,
  maxVisible: number,
): { win: RowWindow | null; active: number } {
  if (panel === undefined) return { win: null, active: 0 };
  const active = panelIndex(mode, panel.rows.length);
  return { win: windowRows(panel.rows, active, maxVisible), active };
}

function fieldGeometry(
  t: AdwaitaTheme,
  oneRow: boolean,
  fieldText: string,
  styles: ComposerStyles,
): { minRows: number; maxRows: number; style: StyleDesc } {
  return {
    minRows: oneRow ? 1 : composerFieldRows(fieldText),
    maxRows: oneRow ? 1 : FIELD_MAX_ROWS,
    style: oneRow ? styles.fieldOneRow : styles.field,
  };
}

function ComposerStatusBar({
  panel,
  panelOpen,
  styles,
}: {
  panel: ComposerPanelSpec | undefined;
  panelOpen: boolean;
  styles: ComposerStyles;
}): JSX.Element | null {
  if (!panelOpen || panel === undefined || panel.status === undefined)
    return null;
  return (
    <StatusBar
      message={panel.status.message}
      hints={panel.status.hints}
      style={styles.statusBar}
    />
  );
}

function ComposerField(props: {
  t: AdwaitaTheme;
  styles: ComposerStyles;
  fieldText: string;
  placeholder: string;
  panelOpen: boolean;
  model?: string | null;
  thinking?: string | null;
  onText: (next: string) => void;
  onSubmit: (value: string) => void;
  onFieldKey: (event: EventPayload) => void;
  captureField: (node: PublicInstance | null) => void;
  pickActive: () => void;
}): JSX.Element {
  const { styles, t } = props;
  const oneRow = fitsOneRow(props.fieldText);
  const geometry = fieldGeometry(t, oneRow, props.fieldText, styles);
  const showMeta = props.panelOpen === false && draftIsBlank(props.fieldText);
  return (
    <div style={styles.fieldRow}>
      <textarea
        key={props.panelOpen ? "field-in-panel" : "field-draft"}
        value={props.fieldText}
        autoFocus
        ref={props.captureField}
        placeholder={props.placeholder}
        minRows={geometry.minRows}
        maxRows={geometry.maxRows}
        theme={buildNativeTheme(t)}
        onChange={(e) => props.onText(e.value ?? "")}
        onSubmit={(e) => {
          if (props.panelOpen) {
            props.pickActive();
            return;
          }
          props.onSubmit(e.value ?? "");
        }}
        onKeyDown={(event) => void props.onFieldKey(event)}
        style={geometry.style}
      />
      {showMeta && (
        <ComposerMeta
          model={props.model}
          thinking={props.thinking}
          styles={styles}
        />
      )}
    </div>
  );
}

function ComposerLayout(props: {
  wide: boolean;
  panelOpen: boolean;
  panel: ComposerPanelSpec | undefined;
  win: RowWindow | null;
  active: number;
  previewMaxPx: number;
  styles: ComposerStyles;
  statusBar: JSX.Element | null;
  field: JSX.Element;
  onListKey: (event: EventPayload) => void;
  capturePanel: (node: PublicInstance | null) => void;
}): JSX.Element {
  const { styles, panel, win } = props;
  const list =
    panel === undefined || win === null ? null : (
      <ComposerPanel
        panel={panel}
        win={win}
        active={props.active}
        styles={styles}
        previewLines={
          props.wide ? [] : previewLinesOf(panel.preview, props.previewMaxPx)
        }
        onKeyDown={props.onListKey}
        panelRef={props.capturePanel}
      />
    );
  if (props.wide && list !== null)
    return (
      <div style={styles.root}>
        <div style={styles.box}>
          {list}
          {props.statusBar}
        </div>
      </div>
    );
  return (
    <div style={styles.root}>
      <div style={styles.box}>
        {props.field}
        {props.panelOpen && list}
        {props.statusBar}
      </div>
    </div>
  );
}

export function Composer(props: ComposerProps): JSX.Element {
  const t = useAdwaita();
  const { mode, panel } = props;
  const { panelOpen, wideOpen } = panelStateOf(mode, panel);
  const styles = composerStyles(
    t,
    props.tone ?? "idle",
    props.style,
    false,
    panel?.height,
    contextRingOf(panelOpen, props.context ?? null),
  );
  const maxVisible = panel?.maxVisible ?? DEFAULT_MAX_VISIBLE;
  const { win, active } = rowWindowOf(panel, mode, maxVisible);

  const keys = useComposerKeys({
    mode,
    panel,
    panelOpen,
    wideOpen,
    value: props.value,
    isStreaming: props.isStreaming,
    onChange: props.onChange,
    onMode: props.onMode,
    onAbort: props.onAbort,
    onHistory: props.onHistory,
    onClear: props.onClear,
    onPaste: props.onPaste,
    onComplete: props.onComplete,
  });

  return (
    <ComposerLayout
      wide={wideOpen}
      panelOpen={panelOpen}
      panel={panel}
      win={win}
      active={active}
      previewMaxPx={maxVisible * t.control.rowHeight}
      styles={styles}
      statusBar={
        <ComposerStatusBar
          panel={panel}
          panelOpen={panelOpen}
          styles={styles}
        />
      }
      field={
        <ComposerField
          t={t}
          styles={styles}
          fieldText={fieldTextOf(mode, props.value)}
          placeholder={fieldPlaceholderOf(panel, props.placeholder)}
          panelOpen={panelOpen}
          model={props.model}
          thinking={props.thinking}
          onText={keys.onText}
          onSubmit={props.onSubmit}
          onFieldKey={keys.onFieldKey}
          captureField={keys.captureField}
          pickActive={keys.pickActive}
        />
      }
      onListKey={keys.onListKey}
      capturePanel={keys.capturePanel}
    />
  );
}
