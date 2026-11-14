function baseType(mimeType: string): string {
  return (mimeType.split(";")[0] ?? mimeType).trim().toLowerCase();
}

export function mediaKind(mimeType: string): string {
  const base = baseType(mimeType);
  const subtype = base.startsWith("image/")
    ? base.slice("image/".length)
    : base;
  return subtype.replace(/^x-/, "").replace(/\+xml$/, "");
}
