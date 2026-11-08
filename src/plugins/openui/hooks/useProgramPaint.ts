/**
 * Painting a program: evaluate its tree against what the human left, and tell
 * the store what the paint found out.
 *
 * The evaluation is memoised on the source, the values, the served data and
 * what the queries have answered — the four things a paint reads — and the
 * publication goes back through an effect, because a store may not be written
 * from the middle of a render.
 */

import { useEffect, useMemo } from "react";

import { drawnComponents } from "../lib/analysis/parse";
import {
  evaluateProgram,
  queryAnswersOf,
  type ProgramEvaluation,
} from "../lib/analysis/run";
import { programStore, type ProgramRecord } from "../lib/programStore/store";

/** What a paint answers, or nothing for a program the log no longer holds. */
export function useProgramPaint(
  record: ProgramRecord | undefined,
): ProgramEvaluation | null {
  const name = record?.name ?? "";
  const source = record?.source ?? "";
  const has = record !== undefined;

  const values = has ? programStore.valuesOf(record as ProgramRecord) : {};
  const fixtures = programStore.getFixtures();
  const key = [
    name,
    source,
    has ? "held" : "gone",
    JSON.stringify(values),
    Object.keys(fixtures).sort().join(","),
    String(queryAnswersOf(name)),
  ].join("|");

  const paint = useMemo(
    () =>
      record === undefined
        ? null
        : evaluateProgram(record.name, record.result, values),
    // The key is the whole of what a paint reads: the program, its source, its
    // values, the data served to it, and what its queries have answered so far.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  useEffect(() => {
    if (name === "" || paint === null) return;
    programStore.publish(name, {
      drawn: drawnComponents(paint.root),
      failures: paint.failures,
      renderErrors: paint.renderErrors,
      queries: paint.queries,
    });
  }, [key, paint, name]);

  return paint;
}
