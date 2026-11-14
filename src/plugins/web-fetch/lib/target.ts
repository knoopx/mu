/**
 * What a page read may be pointed at.
 *
 * The skill this comes from took "any http(s) URL"; a model dropping the scheme
 * off a host is common enough that a bare host is taken as https rather than
 * refused, and everything else is refused before a browser is started. A fragment
 * comes off the URL, because it selects a place on the page and the page is cached
 * whole — `#section` and the top of the page are the same read, and mu should not
 * pay for both.
 */

import { hostOf } from "../../../utils/urlText";
import type { WebFetchTarget } from "../types";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** A host with a path but no scheme, which is how a model often writes one. */
const looksLikeHost = (value: string): boolean =>
  /^(localhost|\[[\da-f:]+\]|[\w-]+\.[\w-]+(\.[\w-]+)*)([/:?#]|$)/i.test(value);

export function targetOf(raw: string): WebFetchTarget {
  const asked = raw.trim();

  if (asked === "")
    throw new Error("A page read needs a URL — nothing was given.");
  if (/\s/.test(asked))
    throw new Error(
      `“${asked}” is not one URL: it has spaces in it. Give one http(s) URL.`,
    );

  const hasScheme = /^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(asked);
  const bare = !hasScheme && looksLikeHost(asked);
  if (!hasScheme && !bare)
    throw new Error(
      `“${asked}” is not a URL I can fetch — give it a scheme, or a host with a dot in it.`,
    );

  let url: URL;
  try {
    url = new URL(bare ? `https://${asked}` : asked);
  } catch {
    throw new Error(`“${asked}” is not a URL I can fetch.`);
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol))
    throw new Error(
      `${url.protocol.replace(":", "")} is not a web page. A local file goes through \`read\`; this tool reads http(s) URLs.`,
    );

  url.hash = "";
  return { url: url.href, host: hostOf(url.href) };
}
