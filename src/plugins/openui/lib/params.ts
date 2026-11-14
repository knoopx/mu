/**
 * The parameters the OpenUI tools share.
 *
 * Eleven tools name programs, bound lists and take source text; stating each
 * once here is what keeps a ceiling from drifting between them.
 */

import { Type } from "typebox";

import {
  DEFAULT_LIBRARY_LIMIT,
  DEFAULT_PROGRAM_NAME,
  MAX_CHUNK_CHARS,
  MAX_LIBRARY_LIMIT,
  MAX_PROGRAM_CHARS,
  MAX_PROGRAM_NAME,
} from "../constants";
/** The program a call creates or replaces, which must be named. */
export const namedParam = Type.String({
  minLength: 1,
  maxLength: MAX_PROGRAM_NAME,
  pattern: "^\\s*\\S",
  description: `Program to create or replace (default "${DEFAULT_PROGRAM_NAME}"). Keep it stable to edit a program in place.`,
});

/** How many rows a bounded read answers with. */
export const limitParam = (unit: string, max: number = MAX_LIBRARY_LIMIT) =>
  Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: max,
      description: `How many ${unit} to return (default ${String(
        DEFAULT_LIBRARY_LIMIT,
      )}, maximum ${String(max)}).`,
    }),
  );

/** Program source, bounded by what a screen can be. */
export const codeParam = Type.String({
  maxLength: MAX_PROGRAM_CHARS,
  description:
    "The complete OpenUI Lang program — one `root = Stack([ ... ])` statement and the statements it uses.",
});

/** One streamed piece of program source. */
export const chunkParam = Type.String({
  maxLength: MAX_CHUNK_CHARS,
  description:
    "The next piece of OpenUI Lang source, appended to what the program already holds.",
});
