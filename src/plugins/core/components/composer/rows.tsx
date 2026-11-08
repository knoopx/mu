import type { JSX, ReactNode } from "react";
import {
  hexToRgba,
  Icon,
  rowHoverBg,
  selectionBg,
  useAdwaita,
  type AdwaitaTheme,
  type IconName,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";
import { centerRow } from "../../lib/ui/layout";
import { mutedText } from "../../lib/ui/theme";
import { panelInset } from "../../lib/composer/chrome";
import {
  HAIRLINE,
  INLINE_GLYPH,
  ROW_HEIGHT,
  SWATCH_HEIGHT,
  SWATCH_WIDTH,
  figureGap,
  glyphForText,
  lineBox,
  lineBoxAt,
  monoColumn,
  monoTextWidth,
} from "../../lib/ui/tokens";
import type {
  ComposerPanelRow,
  ComposerRowFigure,
  ComposerSwatchSpec,
} from "./Composer";

/** A command row's two fixed columns, in characters of the caption size. */
const NAME_COLUMN_CHARS = 12;
const ARGS_COLUMN_CHARS = 16;

/** A figure's glyph stands beside caption text and takes its measure. */
const figureGlyph = (t: AdwaitaTheme): number => glyphForText(t.type.caption);

/** The air between one figure's glyph and the digits it labels. */
const figureGlyphGap = (t: AdwaitaTheme): number => t.space.xs;

/** A figure's text is monospace, so its column is measured, not budgeted. */
export const composerFigureTextWidth = (
  t: AdwaitaTheme,
  chars: number,
): number => monoTextWidth(t, chars);

export const composerFigureGlyphWidth = (
  t: AdwaitaTheme,
): number => figureGlyph(t);

export const composerFigureColumnWidth = (
  t: AdwaitaTheme,
  chars: number,
): number =>
  figureGlyph(t) + figureGlyphGap(t) + composerFigureTextWidth(t, chars);

function panelRowStyle(
  t: AdwaitaTheme,
  active: boolean,
  focused: boolean,
  height: number,
  extra?: Partial<StyleDesc>,
): StyleDesc {
  return {
    ...centerRow(t.space.sm, { height, ...extra }),
    paddingLeft: panelInset(t),
    paddingRight: panelInset(t),
    borderRadius: t.radius.sm,
    cursor: "pointer",
    userSelect: "none",
    backgroundColor: active ? selectionBg(t, focused) : "transparent",
    hover: active ? undefined : { backgroundColor: rowHoverBg(t) },
  };
}

function rowStyle(t: AdwaitaTheme, active: boolean, focused = true): StyleDesc {
  return panelRowStyle(t, active, focused, ROW_HEIGHT);
}

/**
 * A row's own ink. `dimmed` is the ink of a row there to be read, not acted on:
 * it takes the row's meta ink, so the whole line reads at one quiet level.
 */
const label = (t: AdwaitaTheme, dimmed = false): StyleDesc => ({
  fontSize: t.type.caption,
  fontFamily: t.type.fontFamily,
  color: dimmed ? mutedText(t) : t.color.text.primary,
  userSelect: "none",
  whiteSpace: "nowrap",
});

const meta = (t: AdwaitaTheme): StyleDesc => ({
  fontSize: t.type.caption,
  fontFamily: t.type.fontFamily,
  color: mutedText(t),
  userSelect: "none",
  whiteSpace: "nowrap",
});

const truncate = (t: AdwaitaTheme): StyleDesc => ({
  flexShrink: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
});

function optionRowHeight(t: AdwaitaTheme, hasCaption: boolean): number {
  if (!hasCaption) return ROW_HEIGHT;
  return Math.ceil(lineBox(t, "caption") * 2 + t.space.xs);
}

export function composerPanelRowHeight(
  t: AdwaitaTheme,
  row: ComposerPanelRow,
): number {
  if (row.kind !== "option") return ROW_HEIGHT;
  return optionRowHeight(
    t,
    row.caption !== undefined && row.caption !== row.label,
  );
}

function optionRowStyle(
  t: AdwaitaTheme,
  active: boolean,
  hasCaption: boolean,
  focused = true,
): StyleDesc {
  return panelRowStyle(t, active, focused, optionRowHeight(t, hasCaption), {
    flexShrink: 0,
    overflow: "hidden",
  });
}

function RowIcon({
  t,
  icon,
  active,
}: {
  t: AdwaitaTheme;
  icon: IconName;
  active: boolean;
}): JSX.Element {
  return (
    <Icon
      name={icon}
      size={INLINE_GLYPH}
      color={active ? t.color.accent.base : mutedText(t)}
      style={{ flexShrink: 0 }}
    />
  );
}

function ComposerRow({
  t,
  style,
  icon,
  active,
  onClick,
  onHover,
  children,
}: {
  t: AdwaitaTheme;
  style: StyleDesc;
  icon?: IconName;
  active: boolean;
  onClick: () => void;
  onHover: () => void;
  children: ReactNode;
}): JSX.Element {
  return (
    <div style={style} onClick={onClick} onMouseEnter={onHover}>
      {icon !== undefined && <RowIcon t={t} icon={icon} active={active} />}
      {children}
    </div>
  );
}

const textColumn = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  flexGrow: 1,
  flexShrink: 1,
  minWidth: 0,
  gap: t.space.xs,
});

const rowLine = (t: AdwaitaTheme, size: number, lines: number): StyleDesc => ({
  flexShrink: 0,
  minWidth: 0,
  maxWidth: "100%",
  lineHeight: lineBoxAt(t, "caption", size),
  lineClamp: lines,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

const figureGroup = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: figureGap(t),
  flexShrink: 0,
  pointerEvents: "none",
});

const figureCell = (t: AdwaitaTheme, width: number | undefined): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: figureGlyphGap(t),
  flexShrink: 0,
  ...(width === undefined ? {} : { width }),
});

const figureText = (t: AdwaitaTheme): StyleDesc => ({
  fontSize: t.type.caption,
  fontFamily: t.type.fontFamilyMono,
  color: mutedText(t),
  whiteSpace: "nowrap",
  userSelect: "none",
  flexShrink: 0,
});

function RowFigures({
  t,
  figures,
}: {
  t: AdwaitaTheme;
  figures: readonly ComposerRowFigure[];
}): JSX.Element {
  const glyph = figureGlyph(t);
  const ink = mutedText(t);
  return (
    <div style={figureGroup(t)}>
      {figures.map((figure, off) => (
        <div key={`figure-${off}`} style={figureCell(t, figure.width)}>
          {figure.icon === undefined ? null : (
            <Icon
              name={figure.icon}
              size={glyph}
              color={figure.color ?? ink}
              style={{ flexShrink: 0, userSelect: "none" }}
            />
          )}
          {figure.text === "" ? null : (
            <text style={figureText(t)}>{figure.text}</text>
          )}
        </div>
      ))}
    </div>
  );
}

/** A row's trailing age: two characters of a mono column, right-aligned. */
const AGE_COLUMN_WIDTH = (t: AdwaitaTheme): number => monoColumn(t, 2);

const ageColumn = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  width: AGE_COLUMN_WIDTH(t),
  flexShrink: 0,
  pointerEvents: "none",
});

export interface ComposerCommandRowProps {
  name: string;
  args?: string;
  description?: string;
  icon?: IconName;

  active: boolean;
  onClick: () => void;
  onHover: () => void;
}

export function ComposerCommandRow(
  props: ComposerCommandRowProps,
): JSX.Element {
  const t = useAdwaita();
  return (
    <ComposerRow
      t={t}
      style={rowStyle(t, props.active)}
      icon={props.icon}
      active={props.active}
      onClick={props.onClick}
      onHover={props.onHover}
    >
      <text
        style={{
          ...label(t),
          width: monoColumn(t, NAME_COLUMN_CHARS),
          flexShrink: 0,
        }}
      >
        {props.name}
      </text>

      <text
        style={{
          ...meta(t),
          width: monoColumn(t, ARGS_COLUMN_CHARS),
          ...truncate(t),
        }}
      >
        {props.args ?? ""}
      </text>
      {props.description !== undefined && (
        <text style={{ ...meta(t), ...truncate(t) }}>{props.description}</text>
      )}
    </ComposerRow>
  );
}

export interface ComposerOptionRowProps {
  label: string;

  caption?: string;
  description?: string;

  figures?: ComposerRowFigure[];

  trailing?: ReactNode;
  icon?: IconName;

  tabular?: boolean;

  picked: boolean;

  /** A row there to be read, not acted on: an immutable change, a placeholder. */
  dimmed?: boolean;

  checkColumn?: boolean;
  active: boolean;

  focused?: boolean;
  onClick: () => void;
  onHover: () => void;
}

export function ComposerOptionRow(props: ComposerOptionRowProps): JSX.Element {
  const t = useAdwaita();
  const showMeta =
    props.description !== undefined && props.description !== props.label;
  const caption =
    props.caption !== undefined && props.caption !== props.label
      ? props.caption
      : undefined;
  return (
    <ComposerRow
      t={t}
      style={optionRowStyle(
        t,
        props.active,
        caption !== undefined,
        props.focused !== false,
      )}
      icon={props.icon}
      active={props.active}
      onClick={props.onClick}
      onHover={props.onHover}
    >
      <div style={textColumn(t)}>
        <text
          style={{
            ...label(t, props.dimmed === true),
            ...rowLine(t, t.type.caption, 1),
          }}
        >
          {props.label}
        </text>
        {caption !== undefined && (
          <text
            style={{
              ...meta(t),
              ...rowLine(t, t.type.caption, 1),
              ...truncate(t),
              width: "100%",
            }}
          >
            {caption}
          </text>
        )}
      </div>
      {props.figures !== undefined && props.figures.length > 0 ? (
        <RowFigures t={t} figures={props.figures} />
      ) : null}
      {props.trailing !== undefined
        ? props.trailing
        : showMeta &&
          (props.tabular === true ? (
            <div style={ageColumn(t)}>
              <text
                style={{
                  ...meta(t),
                  ...rowLine(t, t.type.caption, 1),
                  fontFamily: t.type.fontFamilyMono,
                  width: "100%",
                  textAlign: "right",
                }}
              >
                {props.description}
              </text>
            </div>
          ) : (
            <text
              style={{
                ...meta(t),
                ...truncate(t),
                lineHeight: lineBox(t, "caption"),
                textAlign: "right",
              }}
            >
              {props.description}
            </text>
          ))}
      {props.picked ? (
        <Icon
          name="check"
          size={INLINE_GLYPH}
          color={t.color.accent.base}
          style={{ flexShrink: 0 }}
        />
      ) : props.checkColumn === true ? (
        <div
          style={{
            width: INLINE_GLYPH,
            height: INLINE_GLYPH,
            flexShrink: 0,
            pointerEvents: "none",
          }}
        />
      ) : null}
    </ComposerRow>
  );
}

function swatchStyle(t: AdwaitaTheme, swatch: ComposerSwatchSpec): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: t.space.xs,
    width: SWATCH_WIDTH,
    height: SWATCH_HEIGHT,
    flexShrink: 0,
    justifyContent: "center",
    paddingLeft: t.space.xs,
    paddingRight: t.space.xs,
    borderRadius: t.radius.xs,
    borderWidth: HAIRLINE,
    borderColor: hexToRgba(swatch.text, 0.34),
    backgroundColor: swatch.window,
    pointerEvents: "none",
  };
}

function swatchStrip(
  t: AdwaitaTheme,
  swatch: ComposerSwatchSpec,
  width: number | string,
  ink = false,
): StyleDesc {
  return {
    width,
    height: t.radius.xs,
    flexShrink: 0,
    borderRadius: t.radius.xs / 2,
    backgroundColor: ink ? hexToRgba(swatch.text, 0.75) : swatch.surface,
    pointerEvents: "none",
  };
}

function ThemePreview({
  t,
  swatch,
}: {
  t: AdwaitaTheme;
  swatch: ComposerSwatchSpec;
}): JSX.Element {
  return (
    <div style={swatchStyle(t, swatch)}>
      <div style={swatchStrip(t, swatch, "100%")} />
      <div style={swatchStrip(t, swatch, "62%", true)} />
    </div>
  );
}

export interface ComposerThemeRowProps {
  label: string;

  swatch: ComposerSwatchSpec;

  active: boolean;
  onClick: () => void;
  onHover: () => void;
}

export function ComposerThemeRow(props: ComposerThemeRowProps): JSX.Element {
  const t = useAdwaita();
  return (
    <ComposerRow
      t={t}
      style={optionRowStyle(t, props.active, false)}
      active={props.active}
      onClick={props.onClick}
      onHover={props.onHover}
    >
      <text
        style={{
          ...label(t),
          ...rowLine(t, t.type.caption, 1),
          flexGrow: 1,
        }}
      >
        {props.label}
      </text>
      <ThemePreview t={t} swatch={props.swatch} />
    </ComposerRow>
  );
}

export function ComposerStatus(props: {
  text: string;
  destructive?: boolean;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        height: ROW_HEIGHT,
        paddingLeft: panelInset(t),
        paddingRight: panelInset(t),
        userSelect: "none",
      }}
    >
      <text
        style={{
          fontSize: t.type.caption,
          fontFamily: t.type.fontFamily,
          color:
            props.destructive === true
              ? t.color.functional.destructive
              : mutedText(t),
        }}
      >
        {props.text}
      </text>
    </div>
  );
}
