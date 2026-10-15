import { themeNameList } from "../theme/themeStore";
import type { CommandPlugin } from "./types";

export const themeCommand: CommandPlugin = {
  name: "theme",
  description: "Switch the theme with a live preview",
  icon: "darkMode",
  args: themeNameList(),
  target: "theme",
};
