import type { IconName } from "adwaita-gpuix";

export const TOOL_ICONS: Record<string, IconName> = {
  read: "description",
  bash: "terminal",
  edit: "editDocument",
  write: "noteAdd",
  "ask-user": "help",
  "search-duckduckgo": "search",
};

export function toolIconOf(name: string): IconName {
  return TOOL_ICONS[name.toLowerCase()] ?? "terminal";
}
