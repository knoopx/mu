/**
 * The parameters every code-quality tool takes.
 *
 * A finding list has to be bounded, so all six tools carry the same `limit`
 * with the same default and ceiling, and each says in its own words what a
 * finding is — a function, an issue, a clone group, an export, an edge. The
 * schema is written once here so a ceiling change is one edit.
 */

import { Type } from "typebox";

import { DEFAULT_FINDING_LIMIT, MAX_FINDING_LIMIT } from "../constants";

/** How many rows a call answers with, worst first. */
export const limitParam = (unit: string) =>
  Type.Optional(
    Type.Number({
      minimum: 1,
      maximum: MAX_FINDING_LIMIT,
      description: `How many ${unit} to return (default ${String(
        DEFAULT_FINDING_LIMIT,
      )}, maximum ${String(MAX_FINDING_LIMIT)}).`,
    }),
  );
