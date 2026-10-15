import { execFile } from "node:child_process";

export interface ClipboardBytes {
  data: Buffer;

  mimeType: string;
}

const LIST_TIMEOUT_MS = 1000;
const READ_TIMEOUT_MS = 5000;
const MAX_CLIPBOARD_BYTES = 64 * 1024 * 1024;

const PREFERRED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/tiff",
];

function baseType(mimeType: string): string {
  return (mimeType.split(";")[0] ?? mimeType).trim().toLowerCase();
}

function isWayland(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.WAYLAND_DISPLAY) || env.XDG_SESSION_TYPE === "wayland";
}

function runBuffer(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<Buffer | undefined> {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      {
        encoding: "buffer",
        timeout: timeoutMs,
        maxBuffer: MAX_CLIPBOARD_BYTES,
      },
      (err, stdout) => {
        if (err !== null && stdout.length === 0) resolve(undefined);
        else resolve(stdout);
      },
    );
  });
}

function runText(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: timeoutMs }, (err, stdout) => {
      if (err !== null && stdout === "") resolve(undefined);
      else resolve(stdout);
    });
  });
}

function pickImageType(types: string[]): string | undefined {
  const list = types.map((t) => t.trim()).filter(Boolean);
  for (const want of PREFERRED_IMAGE_TYPES) {
    const match = list.find((t) => baseType(t) === want);
    if (match !== undefined) return match;
  }
  return list.find((t) => baseType(t).startsWith("image/"));
}

type Read = ClipboardBytes | null | undefined;

async function readImageWith(
  listTypes: () => Promise<string | undefined>,
  readBytes: (type: string) => Promise<Buffer | undefined>,
): Promise<Read> {
  const types = await listTypes();
  if (types === undefined) return undefined;
  const selected = pickImageType(types.split(/\r?\n/));
  if (selected === undefined) return null;
  const data = await readBytes(selected);
  if (data === undefined) return undefined;
  if (data.length === 0) return null;
  return { data, mimeType: baseType(selected) };
}

const readImageViaWlPaste = (): Promise<Read> =>
  readImageWith(
    () => runText("wl-paste", ["--list-types"], LIST_TIMEOUT_MS),
    (type) =>
      runBuffer("wl-paste", ["--type", type, "--no-newline"], READ_TIMEOUT_MS),
  );

const readImageViaXclip = (): Promise<Read> =>
  readImageWith(
    () =>
      runBuffer(
        "xclip",
        ["-selection", "clipboard", "-t", "TARGETS", "-o"],
        LIST_TIMEOUT_MS,
      ).then((targets) => targets?.toString("utf-8")),
    (type) =>
      runBuffer(
        "xclip",
        ["-selection", "clipboard", "-t", type, "-o"],
        READ_TIMEOUT_MS,
      ),
  );

export async function readClipboardImage(): Promise<ClipboardBytes | null> {
  if (isWayland()) {
    const viaWlPaste = await readImageViaWlPaste();
    if (viaWlPaste !== undefined) return viaWlPaste;
  }
  const viaXclip = await readImageViaXclip();
  return viaXclip ?? null;
}

export async function readClipboardText(): Promise<string | null> {
  const readers: Array<[string, string[]]> = isWayland()
    ? [
        ["wl-paste", ["--type", "text/plain"]],
        ["wl-paste", []],
      ]
    : [["xclip", ["-selection", "clipboard", "-o", "-t", "UTF8_STRING"]]];
  for (const [command, args] of readers) {
    const out = await runText(command, args, READ_TIMEOUT_MS);
    if (out !== undefined && out !== "") return out;
  }
  return null;
}
