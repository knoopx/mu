/**
 * Tool output the log can be read in.
 *
 * Tool results are shown as monospaced text, so these tools write aligned
 * columns rather than markdown: a table you can scan with your eye, in the
 * same shape every guardrails tool uses, ending in a summary line.
 */

const width = (row: readonly string[], column: number): number =>
  row[column].length;

export function reportTable(
  columns: readonly string[],
  rows: readonly (readonly string[])[],
): string {
  if (rows.length === 0) return "";
  const widths = columns.map((column, index) =>
    Math.max(column.length, ...rows.map((row) => width(row, index))),
  );
  const line = (cells: readonly string[]): string =>
    cells
      .map((cell, index) =>
        index === cells.length - 1 ? cell : cell.padEnd(widths[index]!),
      )
      .join("  ")
      .trimEnd();
  return [line(columns), ...rows.map(line)].join("\n");
}

/** `pass=3 fail=0 total=3` — the line a suite run is judged by. */
export const reportSummary = (
  parts: readonly (readonly [string, string | number])[],
): string => parts.map(([key, value]) => `${key}=${String(value)}`).join(" ");

export const yesNo = (value: boolean): string => (value ? "yes" : "no");
