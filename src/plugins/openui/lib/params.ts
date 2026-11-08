/**
 * The parameters the openui tools take.
 *
 * Eleven tools share four ideas — which program, what source, whether the
 * stream is closed, and whether this program is the one painted live — so the
 * schemas are written once here and each tool says in its own words what the
 * same shape means for it. A tool names a program and a body, never a file, a
 * port or a session.
 */

import { Type } from "typebox";

import { DEFAULT_PROGRAM, MAX_PROGRAM_CHARS } from "../constants";

/** Which program the call means; most calls mean the one default sheet. */
export const programParam = (role: string) =>
  Type.Optional(
    Type.String({
      description: `${role} (default "${DEFAULT_PROGRAM}").`,
    }),
  );

/** A program the caller names, where guessing wrong is worth reporting. */
export const namedProgramParam = (role: string) =>
  Type.String({
    description: `${role} — an existing program name; openui-list answers the names.`,
  });

/** The program a call reads, defaulting to whatever is on screen. */
export const readProgramParam = () =>
  Type.Optional(
    Type.String({
      description: "Program to read; defaults to the program the log shows.",
    }),
  );

/** A whole program, replacing what was there. */
export const codeParam = () =>
  Type.String({
    maxLength: MAX_PROGRAM_CHARS,
    description:
      "The complete OpenUI Lang program — one `root = Stack([ ... ])` statement and the statements it uses.",
  });

/** One piece of a program being written out. */
export const chunkParam = () =>
  Type.String({
    description:
      "The next piece of OpenUI Lang source, appended to what the program already holds.",
  });

/** Whether this call is the last piece of the program. */
export const doneParam = (openByDefault: boolean) =>
  Type.Optional(
    Type.Boolean({
      description: `true closes the program and stops the live render mid-stream${
        openByDefault ? " (default false)" : " (default true)"
      }.`,
    }),
  );

/** Whether this program becomes the one the log paints live. */
export const activateParam = () =>
  Type.Optional(
    Type.Boolean({
      description: "Make this program the one the log paints live (default true).",
    }),
  );
