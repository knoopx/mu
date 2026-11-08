/**
 * The parameters the vcs tools share.
 *
 * A read is bounded and paged the same way whatever it reads, so the ceiling,
 * the floor and the paging text are stated once here and each tool only names
 * what it counts — commits, revisions, operations. A write names its revision,
 * its selection and its message the same way, once.
 */

import { Type } from "typebox";

/** The most a read's `limit` may ask for: no read answers with the whole repo, and none needs more than this. */
const TOOL_LIMIT_CAP = 500;

/** How many rows a read answers with, newest first unless `oldest_first` says otherwise. */
export const limitParam = (unit: string, defaults = 25) =>
  Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: TOOL_LIMIT_CAP,
      description: `Cap on ${unit} (default ${String(defaults)}).`,
    }),
  );

/** Where in the list a read starts. */
export const offsetParam = (unit: string) =>
  Type.Optional(
    Type.Number({
      minimum: 0,
      description: `Skip the first N ${unit} (default 0).`,
    }),
  );

/** The one order switch the reads share. */
export const oldestFirstParam = () =>
  Type.Optional(
    Type.Boolean({ description: "Oldest-first ordering (jj `--reversed`)." }),
  );

/** The one verbosity switch the reads share: what each form costs. */
export const formatParam = (compact: string, full: string) =>
  Type.Optional(
    Type.Union([Type.Literal("compact"), Type.Literal("full")], {
      description: `\`compact\` ${compact}; \`full\` ${full}.`,
    }),
  );

/** A value a write must be given: it may not arrive empty or blank. */
export const requiredText = (description: string) =>
  Type.String({ minLength: 1, pattern: "^\\s*\\S", description });
