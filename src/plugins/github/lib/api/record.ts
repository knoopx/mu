/**
 * Reading GitHub's JSON without trusting it.
 *
 * An API body arrives as unknown: a field can be absent, `null` where the
 * record says a string, or a nested object where a login was wanted. Every read
 * here answers with text, a number or a list, and never throws, so a shape
 * change at GitHub costs one empty field rather than a crashed tool row. The
 * words those values get stay in the callers — this file only makes them safe to
 * hold.
 */

import { MAX_ROW_TEXT, SHORT_SHA } from "../../constants";
import { clipText } from "../../../core/lib/agent/toolText";
import { singleLine } from "../../../../utils/truncate";

export const recordOf = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const listOf = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

export function stringOf(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

export function numberOf(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export const flagOf = (value: unknown): boolean => value === true;

/** One level down: whatever GitHub put at a key, read as a record, or empty. */
export const nested = (value: unknown): Record<string, unknown> =>
  recordOf(value);

export const loginOf = (value: unknown): string =>
  stringOf(nested(value)["login"]) || stringOf(value);

/** A date GitHub gives as ISO text, to the minute — enough to order a list by. */
export function dateOf(value: unknown): string {
  const text = stringOf(value);
  if (text === "") return "";
  const stamp = new Date(text);
  if (Number.isNaN(stamp.getTime())) return text;
  return stamp.toISOString().slice(0, 16).replace("T", " ");
}

export const dateOnlyOf = (value: unknown): string =>
  stringOf(value).slice(0, 10);

/** A byte count GitHub gives as a number, in the size words the app uses. */
export function sizeOf(value: unknown): string {
  const bytes = numberOf(value);
  if (bytes <= 0) return "";
  if (bytes < 1024) return `${String(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${String(Math.round(kb))} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export const shortSha = (sha: string): string => sha.slice(0, SHORT_SHA);

/** A repository's licence, in the word GitHub spells for it, or nothing. */
export function licenseOf(value: unknown): string {
  const spdx = stringOf(nested(value)["spdx_id"]);
  if (spdx === "" || spdx === "NOASSERTION") return "";
  return spdx;
}

export const countsOf = (additions: unknown, deletions: unknown): string =>
  numberOf(additions) === 0 && numberOf(deletions) === 0
    ? ""
    : `+${String(numberOf(additions))} −${String(numberOf(deletions))}`;

/** A description, a body, a title: whatever a row trails, on one line. */
export const textOf = (value: unknown, max = MAX_ROW_TEXT): string =>
  clipText(singleLine(stringOf(value)), max);

/** A label list, as the words a reader scans. */
export function labelsOf(value: unknown): string {
  return listOf(value)
    .map((item) => stringOf(recordOf(item)["name"]))
    .filter((name) => name !== "")
    .join(", ");
}

/** A file's base64 content, decoded. `null` when the bytes are not text. */
export function decodeContent(value: unknown): string | null {
  const encoded = stringOf(value).replace(/\s+/g, "");
  if (encoded === "") return null;
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
  if (bytes.includes(0)) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Whether text is worth showing as source at all. */
export const looksBinary = (text: string): boolean => text.includes("\0");
