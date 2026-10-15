import type { CommandPlugin } from "./types";

export const resumeCommand: CommandPlugin = {
  name: "resume",
  description: "Resume an existing session",
  icon: "schedule",
  args: "session",
  target: "session",
};
