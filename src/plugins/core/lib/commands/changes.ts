import type { CommandPlugin } from "./types";

export const changesCommand: CommandPlugin = {
  name: "changes",
  description: "Browse the change stack, files and diffs",
  icon: "list",
  target: "changes",
};
