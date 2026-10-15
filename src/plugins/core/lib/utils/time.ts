export function relativeAge(ts: Date | string, now: Date = new Date()): string {
  const from = typeof ts === "string" ? new Date(ts) : ts;
  const sec = Math.max(0, Math.floor((now.getTime() - from.getTime()) / 1000));
  if (sec < 60) return "now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const wk = Math.floor(day / 7);
  if (wk < 52) return `${wk}w`;
  return `${Math.floor(day / 365)}y`;
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const units: Array<[number, string]> = [
    [86400, "d"],
    [3600, "h"],
    [60, "m"],
    [1, "s"],
  ];
  const parts: string[] = [];
  let rest = total;
  for (const [size, label] of units) {
    const n = Math.floor(rest / size);
    if (n > 0) {
      parts.push(`${n}${label}`);
      rest %= size;
    }
    if (parts.length === 2) break;
  }
  return parts.length > 0 ? parts.join(" ") : "0s";
}
