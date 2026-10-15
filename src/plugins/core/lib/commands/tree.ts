import type { CommandPlugin } from "./types";

export const treeCommand: CommandPlugin = {
  name: "tree",
  description: "Jump back to an earlier point in this session",
  icon: "accountTree",
  target: "tree",
};
