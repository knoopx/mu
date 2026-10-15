import { spawn } from "node:child_process";

export type LinkOpener = (url: string) => void;

let linkOpener: LinkOpener | undefined;

function setLinkOpener(opener: LinkOpener | undefined): void {
  linkOpener = opener;
}

const LAUNCHERS = ["xdg-open", "open"];

function spawnLauncher(cmd: string, url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, [url], {
      stdio: "ignore",
      detached: true,
    });
    child.once("error", (error: NodeJS.ErrnoException) => reject(error));
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

function httpUrl(url: string): string {
  const trimmed = url.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(`Not a link: ${trimmed}`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    throw new Error(`Not a web link: ${trimmed}`);
  return parsed.href;
}

export async function openExternal(url: string): Promise<void> {
  const link = httpUrl(url);

  if (linkOpener !== undefined) {
    linkOpener(link);
    return;
  }

  const attempted: string[] = [];
  for (const cmd of LAUNCHERS) {
    try {
      await spawnLauncher(cmd, link);
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
      attempted.push(cmd);
    }
  }

  throw new Error(
    `No link opener available (${attempted.join(", ")} not found) — ${link}`,
  );
}
