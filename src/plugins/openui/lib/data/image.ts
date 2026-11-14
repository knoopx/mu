/**
 * A picture a program names, read for the screen that asks for it.
 *
 * `Image("docs/diagram.png")` is a path, not a URL: the same rule every other
 * read of a program's file follows (inside the window's folder, bounded), and
 * the same reason — a drawn screen must not be able to reach the disk anywhere
 * else. A file's bytes go to a data URL because gpuix paints an `img` whose
 * source is a string it decodes itself; there is no network in the page, which
 * is also why an https image says so instead of drawing a broken tile.
 */

import { readFileSync } from "node:fs";

import { imageFormatOfExtension, isRasterFormatName } from "adwaita-gpuix";

import { gateProjectFile, unreadError } from "./gate";

/** The largest picture a program may draw. */
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/** What one image name answered. */
export type ProgramImage =
  | { ok: true; src: string; path: string }
  | { ok: false; error: string };

const MIME_OF: Record<string, string> = {
  bmp: "image/bmp",
  gif: "image/gif",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  png: "image/png",
  svg: "image/svg+xml",
  tiff: "image/tiff",
  webp: "image/webp",
};

/** One picture read before, and when its file last changed. */
const cache = new Map<string, { mtimeMs: number; src: string }>();
const MAX_CACHED = 12;

/** Is this name a picture at all, rather than a file that happens to exist? */
const isProgramImage = (name: string): boolean => isRasterFormatName(name);

/** Read one image name into the string an `img` paints. */
export function programImage(cwd: string, name: string): ProgramImage {
  const wanted = name.trim();
  if (wanted === "") return { ok: false, error: "no image named" };
  if (/^https?:\/\//i.test(wanted))
    return {
      ok: false,
      error:
        "a web image is not fetched here: save it in this folder and name the file",
    };
  if (!isProgramImage(wanted))
    return { ok: false, error: `${wanted} is not a picture` };

  const gate = gateProjectFile(cwd, wanted, MAX_IMAGE_BYTES);
  if (!gate.ok)
    return {
      ok: false,
      error:
        gate.reason === "too-big"
          ? `${wanted} is ${String(Math.round(gate.size / 1024 / 1024))} MB — over what a program draws`
          : gate.error,
    };

  const held = cache.get(gate.target);
  if (held !== undefined && held.mtimeMs === gate.mtimeMs)
    return { ok: true, src: held.src, path: gate.name };

  try {
    const mime = MIME_OF[imageFormatOfExtension(gate.name)] ?? "image/png";
    const src = `data:${mime};base64,${readFileSync(gate.target).toString("base64")}`;
    if (cache.size >= MAX_CACHED) {
      const oldest = cache.keys().next();
      if (!oldest.done) cache.delete(oldest.value);
    }
    cache.set(gate.target, { mtimeMs: gate.mtimeMs, src });
    return { ok: true, src, path: gate.name };
  } catch (error) {
    return { ok: false, error: unreadError(gate.name, error) };
  }
}
