import { closeSync, openSync, readSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { ComposerPreviewSpec } from "../../components/composer/Composer";

const PREVIEW_MAX_LINES = 60;
const PREVIEW_MAX_BYTES = 256 * 1024;

export function readFilePreview(
  cwd: string,
  path: string,
): ComposerPreviewSpec {
  try {
    const size = statSync(resolve(cwd, path)).size;
    const bytes = Math.min(size, PREVIEW_MAX_BYTES);
    const fd = openSync(resolve(cwd, path), "r");
    const buffer = Buffer.alloc(bytes);
    const read = readSync(fd, buffer, 0, bytes, 0);
    closeSync(fd);
    const text = buffer.subarray(0, read).toString("utf8");
    if (text.includes("\u0000")) return { path, lines: [] };
    const lines = text
      .split("\n")
      .slice(0, PREVIEW_MAX_LINES)
      .map((line) => line.replace(/\r$/, ""));
    return { path, lines };
  } catch {
    return { path, lines: [] };
  }
}
