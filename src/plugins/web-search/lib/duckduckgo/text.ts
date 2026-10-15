import type { DuckDuckGoResult } from "./types";

const SEP = " — ";

export function resultsText(query: string, rows: DuckDuckGoResult[]): string {
  if (rows.length === 0) return `No results for "${query}".`;

  const lines: string[] = [
    `${rows.length} ${rows.length === 1 ? "result" : "results"} for "${query}":`,
    "",
  ];
  for (const row of rows) {
    const title = row.title === "" ? row.host : row.title;
    lines.push(`${row.rank}. ${title}${SEP}${row.url}`);
    if (row.snippet !== "") lines.push(`   ${row.snippet}`);
  }
  return lines.join("\n");
}
