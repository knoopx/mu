import type { CommandPlugin } from "./types";

export const guardrailsCommand: CommandPlugin = {
  name: "guardrails",
  description: "Arm the guardrails and read what they blocked",
  icon: "shield",
  target: "guardrails",
};
