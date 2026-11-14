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
  monoTextWidth,
  textWidth,
} from "../../lib/ui/tokens";
import type {
  ComposerPanelRow,
  ComposerRowFigure,
  ComposerSwatchSpec,
} from "./Composer";

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
  // The row carries no width of its own: it takes what the row leaves it, and is
  // the first to give room back when the row runs out.
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
  justifyContent: "flex-end",
  gap: figureGap(t),
  flexShrink: 0,
  pointerEvents: "none",
});

const figureCell = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: figureGlyphGap(t),
  flexShrink: 0,
});

/** A figure's glyph stands beside caption text and takes its measure. */
const figureGlyph = (t: AdwaitaTheme): number => glyphForText(t.type.caption);

/** The air between one figure's glyph and the digits it labels. */
const figureGlyphGap = (t: AdwaitaTheme): number => t.space.xs;

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
        <div key={`figure-${off}`} style={figureCell(t)}>
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

/** A row's trailing age: a mono figure, right-aligned in the row's own room. */
const ageColumn = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  flexShrink: 0,
  pointerEvents: "none",
});

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
