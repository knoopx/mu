/**
 * The host a reader recognises, from a URL the model wrote.
 *
 * `www.` is noise in front of a host and a port is rarely worth the row it sits
 * in, so both come off wherever a URL is named in the log or in an answer.
 */
export function hostOf(url: string): string {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return "";
  }
}
