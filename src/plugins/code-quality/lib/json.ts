

export type JsonRecord = Record<string, unknown>;


export function parseEnvelope(stdout: string): JsonRecord | null {
  const text = stdout.trim();
  if (text === "") return null;
  const start = text.indexOf("{");
  if (start < 0) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(start));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as JsonRecord)
      : null;
  } catch {
    return null;
  }
}

export function recordOf(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

export function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function textOf(record: JsonRecord | null, key: string): string {
  const value = record?.[key];
  return typeof value === "string" ? value : "";
}

function textAt(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function numberOf(record: JsonRecord | null, key: string): number {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function sectionOf(
  record: JsonRecord | null,
  key: string,
): { status: string; data: JsonRecord | null } {
  const section = recordOf(record?.[key]);
  return {
    status: textOf(section, "status"),
    data: recordOf(section?.["data"]),
  };
}


export function recordsOf(value: unknown): JsonRecord[] {
  return listOf(value).flatMap((entry) => {
    const record = recordOf(entry);
    return record === null ? [] : [record];
  });
}


export function stringsOf(value: unknown): string[] {
  return listOf(value).flatMap((entry) => {
    const text = textAt(entry);
    return text === "" ? [] : [text];
  });
}
