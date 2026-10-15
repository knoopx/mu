import { accentNameList } from "../theme/themeStore";
import type { CommandPlugin } from "./types";

export const accentCommand: CommandPlugin = {
  name: "accent",
  description: "Switch the accent colour with a live preview",
  icon: "palette",
  args: accentNameList(),
  target: "accent",
};
