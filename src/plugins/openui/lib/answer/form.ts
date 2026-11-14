/**
 * What a Form answers: one `Label: answer` line per field, which the answer
 * sheet puts in the person's message as they fill it in.
 *
 * The shape of the answer is the reference plugin's, and so is the reason for
 * it: the agent gets a form's whole answer as one paragraph of the message the
 * human sends, so it reads like an answer and not like a state dump. A field
 * with no answer says so with an em dash rather than dropping its line, and a
 * multi-select says what was picked **and** what was not, because "not" is what
 * the agent otherwise has to guess.
 */

import { isReactiveAssign, type ElementNode } from "@openuidev/lang-core";

/** The inputs a Form collects, at any depth inside it. */
const FIELDS: Readonly<Record<string, true>> = {
  Slider: true,
  Stepper: true,
  Toggle: true,
  Choice: true,
  Radio: true,
  Select: true,
  Checklist: true,
  Input: true,
  TextArea: true,
  Rating: true,
  ListEditor: true,
  DateInput: true,
  OptionCards: true,
  Swatches: true,
  EditableTable: true,
  // Retired names, still answered by the forms that wrote them.
  Field: true,
};

/** Fields the person types into: their answer waits for a pause in the typing. */
const TYPED: Readonly<Record<string, true>> = {
  Input: true,
  TextArea: true,
  ListEditor: true,
  DateInput: true,
  EditableTable: true,
  Field: true,
};

const NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

const isElement = (value: unknown): value is ElementNode =>
  typeof value === "object" &&
  value !== null &&
  "typeName" in (value as Record<string, unknown>) &&
  typeof (value as ElementNode).typeName === "string";

/** The name a prop binds, when it binds a `$variable`. */
const boundName = (value: unknown): string =>
  isReactiveAssign(value) ? (value.target ?? "") : "";

/** A field value as message text; "" when empty. */
export function answer(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number")
    return Number.isFinite(value) ? NUMBER.format(value) : "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value))
    return value
      .map(answer)
      .filter((item) => item !== "")
      .join(", ");
  return JSON.stringify(value);
}

/**
 * The values a multi-select offers.
 *
 * An option may be a bare word or an object with its own line — `{value:
 * "Current view", detail: "What the filters show"}` — and either way the answer
 * is what the option is *worth*, which is what the state holds.
 */
const optionValues = (options: unknown): unknown[] => {
  if (!Array.isArray(options)) return [];
  return options.map((option) =>
    typeof option === "object" && option !== null && !Array.isArray(option)
      ? ((option as { value?: unknown }).value ?? "")
      : option,
  );
};

/**
 * A multi-select's answer: what was picked, in option order, and what was not,
 * so the agent learns both — `CSV, JSON (not: XLSX, PDF)`. Nothing picked says
 * so with the options; everything picked says `(all)`.
 */
export function picks(
  picked: readonly unknown[],
  options: readonly unknown[],
): string {
  const shown = (values: readonly unknown[]): string =>
    values
      .map(answer)
      .filter((item) => item !== "")
      .join(", ");
  if (options.length === 0) return shown(picked);
  const chosen = [
    ...options.filter((option) => picked.includes(option)),
    ...picked.filter((value) => !options.includes(value)),
  ];
  const left = options.filter((option) => !picked.includes(option));
  if (chosen.length === 0) return `none (options: ${shown(options)})`;
  if (left.length === 0) return `${shown(chosen)} (all)`;
  return `${shown(chosen)} (not: ${shown(left)})`;
}

/** A field of a Form: the `$variable` it binds, and how its line reads. */
export interface FormField {
  readonly name: string;
  /** The person types into it (Field, TextArea). */
  readonly typed: boolean;
  readonly line: string;
}

/** The line one field answers with: its label, or the name it binds, then what it holds. */
function answerLine(name: string, label: string, text: string): string {
  const head = label === "" ? name : label;
  // A label that already reads as a prompt — a question, or a word with a
  // colon — is not given a second colon.
  const colon = /[?:]$/.test(head) ? "" : ":";
  return `${head}${colon} ${text === "" ? "—" : text}`;
}

/** One element of a Form that is a field: the `$variable` it binds and its answer. */
function fieldOf(
  node: ElementNode,
  props: Record<string, unknown>,
  read: (variable: string) => unknown,
): FormField | null {
  // A retired `Checklist` program bound its list as `values`.
  const name = boundName(props.value ?? props.values);
  if (FIELDS[node.typeName] !== true || name === "") return null;

  const given = read(name);
  const label = typeof props.label === "string" ? props.label.trim() : "";
  // An unrated Rating holds 0: no answer, not a zero.
  const value = node.typeName === "Rating" && given === 0 ? null : given;
  const held = Array.isArray(value) ? value : value === null || value === undefined ? [] : [value];
  const text =
    node.typeName === "Checklist" ||
    (node.typeName === "OptionCards" && Array.isArray(value))
      ? picks(held, optionValues(props.options))
      : answer(value);

  return {
    name,
    typed: TYPED[node.typeName] === true,
    line: answerLine(name, label, text),
  };
}

/** Every field at any depth, in document order. */
function collect(
  node: unknown,
  read: (variable: string) => unknown,
  fields: FormField[],
): void {
  if (Array.isArray(node)) {
    for (const entry of node) collect(entry, read, fields);
    return;
  }
  if (typeof node !== "object" || node === null) return;

  // An element keeps its children in `props`; a value the parse put in a prop
  // holds what is inside it directly.
  const element = isElement(node);
  const props = element
    ? ((node.props ?? {}) as Record<string, unknown>)
    : (node as Record<string, unknown>);

  const field = element ? fieldOf(node, props, read) : null;
  if (field !== null) {
    fields.push(field);
    return;
  }

  for (const value of Object.values(props)) collect(value, read, fields);
}

/** A Form's fields in document order, each with its answer line. */
export function formFields(
  form: unknown,
  read: (variable: string) => unknown,
): FormField[] {
  const fields: FormField[] = [];
  collect((form as ElementNode)?.props?.children ?? null, read, fields);
  return fields;
}

/** A Form's answer: `label: value` per field inside it, joined as one paragraph. */
export function formMessage(
  form: unknown,
  read: (variable: string) => unknown,
): string {
  return formFields(form, read)
    .map((field) => field.line)
    .join("\n");
}
