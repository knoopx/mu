const OSC_RE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const CSI_RE = /\x1b\[[0-9;?]*[ -/]*[\x40-\x7e]/g;
const ESC_RE = /\x1b[^[\\]/g;

export function stripTerminalSequences(text: string): string {
  return text.replace(OSC_RE, "").replace(CSI_RE, "").replace(ESC_RE, "");
}
