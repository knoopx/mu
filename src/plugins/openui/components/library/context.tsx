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
import type { AdwaitaTheme } from "adwaita-gpuix";
import { T } from "adwaita-gpuix";
import type { ElementNode } from "@openuidev/lang-core";

import type { OpenUIEventRecord } from "../../types";
import { innerGap, programEmphasisWeight } from "../../lib/tokens";

/** One reactive prop, read as the human left it. */
export interface ProgramBinding<Value> {
  /** The `$variable` it is bound to, or "" when the program wrote a literal. */
  name: string;
  value: Value;
  set(next: Value): void;
}

/** What one component of the library draws with: the node it was given, and the screen it stands in. */
export type ProgramDrawer = (node: ElementNode, ctx: ProgramContext) => JSX.Element;

/** What a component draws with. */
export interface ProgramContext {
  t: AdwaitaTheme;
  /** Draw one child of a children/items array. */
  node(value: unknown): JSX.Element | null;
  /** Draw every child of an array, skipping what the parse left null. */
  nodes(values: readonly unknown[] | undefined): JSX.Element[];
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
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
      {head}
      {props.body}
    </div>
  );
}

/** The props of one drawn element, narrowed to what a definition expects. */
export function prop<T>(props: Record<string, unknown>, key: string, fallback: T): T {
  const value = props[key];
  return value === undefined || value === null ? fallback : (value as T);
}
