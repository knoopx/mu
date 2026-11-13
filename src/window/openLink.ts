import { launchDefaultApp } from "../utils/launcher";

export type LinkOpener = (url: string) => void;

let linkOpener: LinkOpener | undefined;

function setLinkOpener(opener: LinkOpener | undefined): void {
  linkOpener = opener;
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

/**
 * Hand a web link to the desktop's browser.
 *
 * The launchers are the file opener's — one chain, one answer for what it
 * means for nothing to have started — and the refusal keeps the link, because
 * the row that asked is the only place a reader can see what was not opened.
 */
export async function openExternal(url: string): Promise<void> {
  const link = httpUrl(url);

  if (linkOpener !== undefined) {
    linkOpener(link);
    return;
  }

  const launched = await launchDefaultApp(link);
  if (!launched.ok)
    throw new Error(`Could not open the link: ${launched.error} — ${link}`);
}
