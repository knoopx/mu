/**
 * What every component definition in this library is handed to draw itself,
 * and the two helpers every one of them reaches for: `node`, which turns one
 * entry of a children array into a drawn child (an element, a string, a number,
 * or nothing), and `binding`, which turns one reactive prop into the value the
 * human left it at and a setter that records the interaction.
 *
 * A definition never touches the program store: it reads through this context
 * and reports what the human did through it.
 */

import type { JSX } from "react";
import type { StyleDesc } from "@gpuix/react";
import type { AdwaitaTheme } from "adwaita-gpuix";
import { T } from "adwaita-gpuix";
import { markReactive, type ElementNode } from "@openuidev/lang-core";
import { z } from "zod/v4";

import type { OpenUIEventRecord } from "../../types";
import { mutedText } from "../../../core/lib/ui/theme";
import { innerGap, programEmphasisWeight } from "../../lib/tokens";

/** Mark a prop reactive: the parser then lets a `$variable` bind to it. */
export function reactive<T extends z.ZodType>(schema: T): T {
  markReactive(schema);
  return schema;
}

/** One reactive prop, read as the human left it. */
export interface ProgramBinding<Value> {
  /** The `$variable` it is bound to, or "" when the program wrote a literal. */
  name: string;
  value: Value;
  set(next: Value): void;
}

/** What one component of the library draws with: the node it was given, and the screen it stands in. */
export type ProgramDrawer = (
  node: ElementNode,
  ctx: ProgramContext,
) => JSX.Element;

/** What a component draws with. */
export interface ProgramContext {
  t: AdwaitaTheme;
  /** Which program this screen is — the key a staged answer is filed under. */
  readonly block: string;
  /** Where this component stands in the screen. */
  readonly path: string;
  /** Where its parent stands: what a run of sibling buttons shares as one question. */
  readonly group: string;
  /** Whether the reply this screen stands in has already been answered. */
  readonly answered: boolean;
  /** Draw one child of a children/items array. */
  node(value: unknown): JSX.Element | null;
  /** Draw every child of an array, skipping what the parse left null. A value
   *  that is not an array is drawn as the one child it is. */
  nodes(values: unknown): JSX.Element[];
  /** Read a reactive prop: its value as the human left it, and a setter that writes it back. */
  binding<Value>(value: unknown, fallback: Value): ProgramBinding<Value>;
  /** Report what the human did, in the words a later `openui-events` read prints. */
  fire(event: Omit<OpenUIEventRecord, "at">): void;
  /** Run an action prop: what it changes on the page runs here, what it asks of
   * the agent waits in the program's queue. */
  act(steps: unknown, label: string): void;
  /** The values a form's fields currently hold, sent with a submit. */
  formState(): Record<string, unknown> | undefined;
  /** A stable key for a drawn child, from its statement name or position. */
  keyOf(value: unknown, index: number): string;

  /* --- the answer sheet: what the human answers, and what already went out. --- */

  /** Stage this block's answer to one question; "" takes it out again. */
  stage(position: string, text: string): void;
  /** What this block has staged for one question ("" when nothing has). */
  staged(position: string): string;
  /** What this block already sent as its answer to one question. */
  sentAnswer(position: string): string;
}

/** Is this evaluated prop an element to draw, or a value to print? */
export const isElementNode = (value: unknown): boolean =>
  typeof value === "object" &&
  value !== null &&
  (value as { type?: unknown }).type === "element";

/** A value from a children array that is text rather than a component. */
export const textOf = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return null;
};

/** A plain line of a program's text, for the places a definition needs text and not a widget. */
export function ProgramText(props: {
  value: unknown;
  ctx: ProgramContext;
  size?: "body" | "list" | "caption" | "title4";
  color?: string;
  weight?: number;
  clamp?: number;

  /** A figure, set in mono so a column of them lines up on its digits. */
  mono?: boolean;
}): JSX.Element | null {
  const text = textOf(props.value);
  if (text === null) return null;
  return (
    <T
      size={props.size ?? "body"}
      color={props.color}
      weight={props.weight}
      clamp={props.clamp}
      style={{
        flexShrink: 1,
        minWidth: 0,
        fontFamily: props.mono ? props.ctx.t.type.fontFamilyMono : undefined,
        whiteSpace: props.mono ? "nowrap" : undefined,
      }}
    >
      {text}
    </T>
  );
}

/**
 * The column a block of the language stands in: the pane's whole width, its
 * children at the library's inner gap.
 *
 * An input under its label, a meter under its head, a sparkline beside its
 * caption: each used to spell this style out again in its own drawer, which is
 * how one gap drifts into five different numbers.
 */
export function programColumnStyle(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    minWidth: 0,
    gap: innerGap(t),
  };
}

/**
 * The row a single line of the language stands in: its children on one line,
 * centred, at the library's inner gap — a `Stepper`'s two buttons and its
 * figure, a `Toggle`'s label and its switch.
 */
export function programRowStyle(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
    gap: innerGap(t),
  };
}

/** A `programColumnStyle` band with its children already in it. */
export function ProgramColumn(props: {
  ctx: ProgramContext;
  children: (JSX.Element | null)[] | JSX.Element | null;
}): JSX.Element {
  return <div style={programColumnStyle(props.ctx.t)}>{props.children}</div>;
}

/**
 * A label and the figure that counts it, on one line — the head of a `Bar`, the
 * head of a `Slider`, and anywhere else a screen names a thing and then says how
 * much. One row, so the label's size, the figure's weight and the gap between
 * them are the same measure in every one of them. With a `body` it is the whole
 * meter: the head above whatever measures the label.
 */
export function ProgramFigureRow(props: {
  ctx: ProgramContext;
  label: string;
  figure: string;
  labelSize?: "body" | "list" | "caption";
  labelColor?: string;
  figureColor?: string;
  figureMono?: boolean;

  /** What stands between them, when a figure carries a second fact: a `Bar`'s `×3`. */
  between?: JSX.Element | null;

  /** What the head stands over: a meter, a bar, a strip of segments. */
  body?: JSX.Element | null;
}): JSX.Element {
  const { ctx } = props;
  const head = (
    <div style={{ ...programRowStyle(ctx.t), width: "100%" }}>
      <T
        size={props.labelSize ?? "body"}
        color={props.labelColor ?? ctx.t.color.text.primary}
        clamp={2}
        style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
      >
        {props.label}
      </T>
      {props.between ?? null}
      <T
        size="list"
        weight={programEmphasisWeight(ctx.t)}
        color={props.figureColor ?? ctx.t.color.text.primary}
        clamp={1}
        style={{
          minWidth: 0,
          fontFamily: props.figureMono ? ctx.t.type.fontFamilyMono : undefined,
          whiteSpace: props.figureMono ? "nowrap" : undefined,
        }}
      >
        {props.figure}
      </T>
    </div>
  );

  if (!props.body) return head;
  return (
    <div style={programColumnStyle(ctx.t)}>
      {head}
      {props.body}
    </div>
  );
}

/** The props of one drawn element, narrowed to what a definition expects. */
export function prop<T>(
  props: Record<string, unknown>,
  key: string,
  fallback: T,
): T {
  const value = props[key];
  return value === undefined || value === null ? fallback : (value as T);
}

/**
 * One evaluated value, as the list its prop is declared to be.
 *
 * A program that names a single thing where the component takes a list means
 * one item: `Pane(title, blocks, surface, tone, Caption("biggest 412"))` puts
 * one element in a prop the library declares an array, and the parser says
 * nothing about it. A definition that then reached for `.map` killed the whole
 * screen with a gpuix runtime error — one such prop takes down every other
 * block of the program — so the list is settled here, once: an array is
 * itself, nothing is the fallback, and any other value is a list of one.
 */
export function listOf(value: unknown, fallback: unknown[] = []): unknown[] {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === "") return fallback;
  return [value];
}

/**
 * The text one prop of a drawn element is declared to be.
 *
 * A definition that puts a prop straight into text dies when the program writes
 * a component in that slot — React refuses an object as a child, and the screen
 * goes down with it — so a text slot is read here: what prints is a string, a
 * number or a boolean, and anything else the program put there is the fallback,
 * which for every text slot is nothing.
 */
export function textProp(
  props: Record<string, unknown>,
  key: string,
  fallback = "",
): string {
  return textOf(props[key]) ?? fallback;
}

/** The list one prop of a drawn element is declared to be. */
export function listProp(
  props: Record<string, unknown>,
  key: string,
  fallback: unknown[] = [],
): unknown[] {
  return listOf(props[key], fallback);
}

/**
 * Where a figure's numbers came from, as the program said it.
 *
 * The reference plugin makes a `Table`, a `Chart` and a `Metric` name their
 * source, and the reason is the same one that makes `Load` worth having: a
 * screen full of confident numbers is only honest if the reader can tell where
 * they came from — a file, the human's own words, or the model's head. It is one
 * quiet caption under the figure, never a card of its own, and the program may
 * leave it out.
 */
export function sourceProp(props: Record<string, unknown>): string {
  return textProp(props, "source");
}

/** The caption a figure wears when it was given a source. */
export function ProgramSourceNote(props: {
  ctx: ProgramContext;
  source: string;
}): JSX.Element | null {
  if (props.source === "") return null;
  return (
    <T
      size="caption"
      color={mutedText(props.ctx.t)}
      clamp={2}
      style={{
        minWidth: 0,
        fontFamily: props.ctx.t.type.fontFamilyMono,
      }}
    >
      {props.source}
    </T>
  );
}
