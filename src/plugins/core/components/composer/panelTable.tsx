/**
 * The composer's list panels, drawn as the tables they are.
 *
 * Every panel that shows rows — plugins, sessions, files, models, thinking,
 * commands, guardrails, themes — is a table of those rows: one column per fact,
 * the same columns in the same order in every row, and each column as wide as
 * the widest thing it holds across the list. The widths are not decided here and
 * nowhere else in the app: adwaita's `Table` measures every column across the
 * rows it is handed and gives the width back to each cell of that column
 * (`adwaita-gpuix/src/lib/tableColumns.ts`), so the rows line up under each
 * other, a name is never crushed to `The…` beside a wider neighbour, and a
 * column of two-digit counts stays two digits wide next to a column of
 * sentences.
 *
 * What is decided here is only structural: which facts of a row are columns, how
 * many figure columns a list has (the widest figure run it holds, so a row with
 * fewer pads its cells rather than shoving its neighbours left), and which
 * column takes the room that is left over — the trailing sentence when the list
 * has one, the name when it does not. A column that is not the fluid one asks for
 * none of the leftover: it stands at its measured width.
 */
import type { JSX, ReactNode } from "react";
import {
  hexToRgba,
  Icon,
  Table,
  TableBody,
  TableNodeCell,
  TableRow,
  T,
  useAdwaita,
  useTable,
  type AdwaitaTheme,
  type IconName,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";
import {
  type ComposerPanelRow,
  type ComposerRowFigure,
  type ComposerSwatchSpec,
} from "./Composer";
import { composerPanelRowHeight } from "./rows";
import { mutedText } from "../../lib/ui/theme";
import { HAIRLINE } from "../../lib/ui/tokens";

/** What the list holds, column-wise — measured over every row it holds. */
export interface ComposerPanelShape {
  /** How many figure columns the list has: its widest run of figures. */
  figures: number;

  /** Whether any row trails a tabular figure, so every row holds the column. */
  age: boolean;

  /** Whether any row trails a sentence, so every row holds the column. */
  prose: boolean;

  /** Whether any command row carries arguments, so every row holds the column. */
  args: boolean;

  /** Whether the list shows the picked mark — for every row, or for none. */
  check: boolean;
}

/** The columns one row asks the list for: `true` here means the list holds the
 *  column, whatever this row puts in it. A row's trailing words are a figure or
 *  a sentence, never both, and words that only repeat the name are no column. */
interface RowColumns {
  figures: number;
  age: boolean;
  prose: boolean;
  args: boolean;
  check: boolean;
}

/** A row that asks for nothing — a theme row names itself and paints its ink. */
const NO_COLUMNS: RowColumns = {
  figures: 0,
  age: false,
  prose: false,
  args: false,
  check: false,
};

function columnsOf(row: ComposerPanelRow): RowColumns {
  if (row.kind === "command")
    return {
      ...NO_COLUMNS,
      args: row.args !== undefined && row.args !== "",
      prose: row.description !== undefined,
    };
  if (row.kind === "theme") return NO_COLUMNS;
  const trails = row.description !== undefined && row.description !== row.label;
  return {
    figures: (row.figures ?? []).length,
    age: trails && row.tabular === true,
    prose: trails && row.tabular !== true,
    args: false,
    check: row.picked === true,
  };
}

/** Which columns this list has, read off the rows themselves. */
export function composerPanelShapeOf(
  rows: readonly ComposerPanelRow[],
): ComposerPanelShape {
  const shape: ComposerPanelShape = { ...NO_COLUMNS };
  for (const row of rows) {
    const columns = columnsOf(row);
    shape.figures = Math.max(shape.figures, columns.figures);
    shape.age ||= columns.age;
    shape.prose ||= columns.prose;
    shape.args ||= columns.args;
    shape.check ||= columns.check;
  }
  return shape;
}

/** The table's own measures, read where the cells stand: the size it draws marks
 *  at, and the air a row keeps between its parts. A cell that guessed either
 *  would sit at a measure its column was never sized at.
 *
 *  The words are not here. A panel's ink is one ink — name, caption, figure and
 *  sentence all print at the panel's caption size, which is the size the row's own
 *  height was measured at — and the table measures every word at the size that
 *  word is drawn at, so no column is ever wider than what stands in it. */
function useCellMeasure(): { mark: number; gap: number } {
  const t = useAdwaita();
  const ctx = useTable();
  return {
    mark: ctx?.iconSize ?? t.control.compactIconSize,
    gap: t.control.listRowGap,
  };
}

const ELLIPSIS: Partial<StyleDesc> = {
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  width: "100%",
  minWidth: 0,
};

/** One column's worth of a row: the fluid one takes what the list leaves. */
const growOf = (fluid: boolean): number => (fluid ? 1 : 0);

/** A row's name, with the words that say where it came from under it. */
function LeadCell({
  t,
  label,
  caption,
  icon,
  fluid,
  swatch,
}: {
  t: AdwaitaTheme;
  label: string;
  caption?: string;
  icon?: IconName;
  fluid: boolean;
  swatch?: ComposerSwatchSpec;
}): JSX.Element {
  const measure = useCellMeasure();
  return (
    <TableNodeCell grow={growOf(fluid)}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: measure.gap,
          width: "100%",
          minWidth: 0,
        }}
      >
        {icon === undefined ? null : (
          <Icon
            name={icon}
            size={measure.mark}
            color={mutedText(t)}
            style={{ flexShrink: 0, userSelect: "none" }}
          />
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flexGrow: 1,
            minWidth: 0,
          }}
        >
          <T size="caption" color={t.color.text.primary} style={ELLIPSIS}>
            {label}
          </T>
          {caption === undefined ? null : (
            <T size="caption" color={mutedText(t)} style={ELLIPSIS}>
              {caption}
            </T>
          )}
        </div>
        {swatch === undefined ? null : <Swatch t={t} swatch={swatch} />}
      </div>
    </TableNodeCell>
  );
}

/** One figure: its mark, and the number that mark counts, right-aligned. */
function FigureCell({
  t,
  figure,
}: {
  t: AdwaitaTheme;
  figure?: ComposerRowFigure;
}): JSX.Element {
  const measure = useCellMeasure();
  if (figure === undefined) return <TableNodeCell grow={0}>{null}</TableNodeCell>;
  return (
    <TableNodeCell grow={0} align="right">
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: measure.gap,
          width: "100%",
          minWidth: 0,
        }}
      >
        {figure.icon === undefined ? null : (
          <Icon
            name={figure.icon}
            size={measure.mark}
            color={figure.color ?? mutedText(t)}
            style={{ flexShrink: 0, userSelect: "none" }}
          />
        )}
        {figure.text === "" ? null : (
          <text
            style={{
              fontSize: t.type.caption,
              fontFamily: t.type.fontFamilyMono,
              color: figure.color ?? mutedText(t),
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {figure.text}
          </text>
        )}
      </div>
    </TableNodeCell>
  );
}

/** A row's trailing sentence, or its trailing mono figure. */
function TrailCell({
  t,
  text,
  mono,
  fluid,
}: {
  t: AdwaitaTheme;
  text?: string;
  mono: boolean;
  fluid: boolean;
}): JSX.Element {
  const measure = useCellMeasure();
  if (text === undefined || text === "")
    return <TableNodeCell grow={0}>{null}</TableNodeCell>;
  return (
    <TableNodeCell grow={growOf(fluid)} align="right">
      <text
        style={{
          ...ELLIPSIS,
          fontSize: t.type.caption,
          ...(mono ? { fontFamily: t.type.fontFamilyMono } : {}),
          color: mutedText(t),
          textAlign: "right",
          userSelect: "none",
        }}
      >
        {text}
      </text>
    </TableNodeCell>
  );
}

/** The column that says whether this row is the one already chosen. */
function CheckCell({
  t,
  picked,
}: {
  t: AdwaitaTheme;
  picked: boolean;
}): JSX.Element {
  const measure = useCellMeasure();
  return (
    <TableNodeCell grow={0} align="center">
      {picked ? (
        <Icon
          name="check"
          size={measure.mark}
          color={t.color.accent.base}
          style={{ userSelect: "none" }}
        />
      ) : null}
    </TableNodeCell>
  );
}

/* Theme swatches: the two bands of ink a theme paints its window with. ------- */

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

function Swatch({
  t,
  swatch,
}: {
  t: AdwaitaTheme;
  swatch: ComposerSwatchSpec;
}): JSX.Element {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: t.space.xs,
        height: t.control.compactIconSize,
        flexShrink: 0,
        justifyContent: "center",
        paddingLeft: t.space.xs,
        paddingRight: t.space.xs,
        borderRadius: t.radius.xs,
        borderWidth: HAIRLINE,
        borderColor: hexToRgba(swatch.text, 0.34),
        backgroundColor: swatch.window,
        pointerEvents: "none",
      }}
    >
      <div style={swatchStrip(t, swatch, "100%")} />
      <div style={swatchStrip(t, swatch, "62%", true)} />
    </div>
  );
}

/* The rows ------------------------------------------------------------------ */

type ThemeRow = Extract<ComposerPanelRow, { kind: "theme" }>;
type CommandRow = Extract<ComposerPanelRow, { kind: "command" }>;
type OptionRow = Extract<ComposerPanelRow, { kind: "option" }>;

/** One column of the list, drawn only when the list has it. A column the list
 *  has no row for is absent from every row, so the columns that stay keep the
 *  same order — and a column missing from one row would shove the ones after
 *  it out from under the rows beside it. */
const column = (list: boolean, cell: ReactNode): ReactNode[] =>
  list ? [cell] : [];

/** A theme row is its name and the two bands of ink it paints the window with. */
function themeCells(t: AdwaitaTheme, row: ThemeRow): ReactNode[] {
  return [
    <LeadCell key="lead" t={t} label={row.label} fluid swatch={row.swatch} />,
  ];
}

/** A command row is its name, the arguments it takes, and what it does. */
function commandCells(
  t: AdwaitaTheme,
  row: CommandRow,
  shape: ComposerPanelShape,
): ReactNode[] {
  return [
    <LeadCell
      key="lead"
      t={t}
      label={row.name}
      icon={row.icon}
      fluid={!shape.prose && !shape.args}
    />,
    ...column(
      shape.args,
      <TrailCell
        key="args"
        t={t}
        text={row.args ?? ""}
        mono={false}
        fluid={!shape.prose}
      />,
    ),
    ...column(
      shape.prose,
      <TrailCell key="prose" t={t} text={row.description ?? ""} mono={false} fluid />,
    ),
  ];
}

/** An option row is its name, its figures, one trailing fact, and the mark. */
function optionCells(
  t: AdwaitaTheme,
  row: OptionRow,
  shape: ComposerPanelShape,
): ReactNode[] {
  // The fluid column is the one worth the leftover room: a sentence the list
  // trails, and where there is none, the name itself.
  const described = row.description ?? "";
  const trails = row.description !== undefined && described !== row.label;
  const figures = row.figures ?? [];
  return [
    <LeadCell
      key="lead"
      t={t}
      label={row.label}
      caption={row.caption !== undefined && row.caption !== row.label ? row.caption : undefined}
      icon={row.icon}
      fluid={!shape.prose && !shape.age}
    />,
    // Every row holds as many figure columns as the widest row of the list: a
    // row with fewer leaves the rest of them empty rather than sliding the
    // columns after it out from under the rows beside it.
    ...Array.from({ length: shape.figures }, (_, at) => (
      <FigureCell key={`figure-${String(at)}`} t={t} figure={figures[at]} />
    )),
    ...column(
      shape.age,
      <TrailCell
        key="age"
        t={t}
        text={row.tabular === true ? described : ""}
        mono
        fluid={!shape.prose}
      />,
    ),
    ...column(
      shape.prose,
      <TrailCell
        key="prose"
        t={t}
        text={row.tabular === true || !trails ? "" : described}
        mono={false}
        fluid={shape.prose}
      />,
    ),
    ...column(
      shape.check,
      <CheckCell key="check" t={t} picked={row.picked === true} />,
    ),
  ];
}

function rowCellsOf(
  t: AdwaitaTheme,
  row: ComposerPanelRow,
  shape: ComposerPanelShape,
): ReactNode[] {
  if (row.kind === "theme") return themeCells(t, row);
  if (row.kind === "command") return commandCells(t, row, shape);
  return optionCells(t, row, shape);
}

export interface ComposerPanelTableProps {
  /** The rows the panel shows right now — the list's window, in order. */
  rows: readonly ComposerPanelRow[];

  /** The columns the whole list has, whether or not this window shows them. */
  shape: ComposerPanelShape;

  /** Index of the window's first row, so the cursor survives a scroll. */
  start: number;

  /** The row the keyboard cursor stands on, in the panel's own numbering. */
  active: number;

  onPick: (row: ComposerPanelRow, index: number) => void;
  onHover: (index: number) => void;
}

/** The panel's list: one table, one row per entry, every column aligned. */
export function ComposerPanelTable(
  props: ComposerPanelTableProps,
): JSX.Element {
  const t = useAdwaita();
  return (
    <Table frame="bare" density="compact" selection="accent">
      <TableBody>
        {props.rows.map((row, off) => {
          const index = props.start + off;
          const active = index === props.active;
          return (
            <TableRow
              key={row.key}
              selected={active}
              onSelect={() => props.onPick(row, index)}
              onMouseEnter={() => props.onHover(index)}
              style={{ height: composerPanelRowHeight(t, row), flexShrink: 0 }}
            >
              {rowCellsOf(t, row, props.shape)}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
