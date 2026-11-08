import type { CommandPlugin } from "./types";

export const terminalCommand: CommandPlugin = {
  name: "terminal",
  description: "Open a shell in the composer and keep it running",
  icon: "terminal",
  target: "terminal",
};
