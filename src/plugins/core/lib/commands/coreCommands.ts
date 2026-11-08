import { resumeCommand } from "./resume";
import { changesCommand } from "./changes";
import { oplogCommand } from "./oplog";
import { treeCommand } from "./tree";
import { terminalCommand } from "./terminal";
import { themeCommand } from "./theme";
import { accentCommand } from "./accent";
import { guardrailsCommand } from "./guardrails";
import type { CommandPlugin } from "./types";

export const coreCommands: CommandPlugin[] = [
  resumeCommand,
  changesCommand,
  oplogCommand,
  treeCommand,
  terminalCommand,
  themeCommand,
  accentCommand,
  guardrailsCommand,
];
