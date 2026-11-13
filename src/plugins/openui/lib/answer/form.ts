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
  Field: true,
  TextArea: true,
  Rating: true,
};

/** Fields the person types into: their answer waits for a pause in the typing. */
const TYPED: Readonly<Record<string, true>> = {
  Field: true,
  TextArea: true,
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
  if (typeof value === "number") return Number.isFinite(value) ? NUMBER.format(value) : "";
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(answer).filter((item) => item !== "").join(", ");
  return JSON.stringify(value);
}

/** The values a multi-select offers. */
const optionValues = (options: unknown): unknown[] =>
  Array.isArray(options)
    ? options.filter((option) => option === null || typeof option !== "object")
    : [];

/**
 * A multi-select's answer: what was picked, in option order, and what was not,
 * so the agent learns both — `CSV, JSON (not: XLSX, PDF)`. Nothing picked says
 * so with the options; everything picked says `(all)`.
 */
export function picks(picked: readonly unknown[], options: readonly unknown[]): string {
  const shown = (values: readonly unknown[]): string =>
    values.map(answer).filter((item) => item !== "").join(", ");
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

/** Every field at any depth, in document order. */
function collect(node: unknown, read: (variable: string) => unknown, fields: FormField[]): void {
  if (Array.isArray(node)) {
    for (const entry of node) collect(entry, read, fields);
    return;
  }
  if (typeof node !== "object" || node === null) return;
  if (!isElement(node)) {
    for (const value of Object.values(node as Record<string, unknown>)) collect(value, read, fields);
    return;
  }

  const props = (node.props ?? {}) as Record<string, unknown>;
  const name = boundName(props.value);
  if (FIELDS[node.typeName] && name !== "") {
    const given = read(name);
    const label = typeof props.label === "string" ? props.label.trim() : "";
    // An unrated Rating holds 0: no answer, not a zero.
    const value = node.typeName === "Rating" && given === 0 ? null : given;
    const text =
      node.typeName === "Checklist" && Array.isArray(value)
        ? picks(value, optionValues(props.options))
        : answer(value);
    // A label that already reads as a prompt — a question, or a word with a
    // colon — is not given a second colon.
    fields.push({
      name,
      typed: TYPED[node.typeName] === true,
      line: `${label || name}${/[?:]$/.test(label || name) ? "" : ":"} ${text || "—"}`,
    });
    return;
  }

  for (const value of Object.values(props)) collect(value, read, fields);
}

/** A Form's fields in document order, each with its answer line. */
export function formFields(form: unknown, read: (variable: string) => unknown): FormField[] {
  const fields: FormField[] = [];
  collect((form as ElementNode)?.props?.children ?? null, read, fields);
  return fields;
}

/** A Form's answer: `label: value` per field inside it, joined as one paragraph. */
export function formMessage(form: unknown, read: (variable: string) => unknown): string {
  return formFields(form, read)
    .map((field) => field.line)
    .join("\n");
}
