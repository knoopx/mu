import type { CommandPlugin } from "./types";

export const oplogCommand: CommandPlugin = {
  name: "oplog",
  description: "Browse jj's operation log and rewind the repo to one",
  icon: "history",
  target: "oplog",
};
