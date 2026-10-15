import { resumeCommand } from "./resume";
import { changesCommand } from "./changes";
import { treeCommand } from "./tree";
import { themeCommand } from "./theme";
import { accentCommand } from "./accent";
import type { CommandPlugin } from "./types";

export const coreCommands: CommandPlugin[] = [
  resumeCommand,
  changesCommand,
  treeCommand,
  themeCommand,
  accentCommand,
];
