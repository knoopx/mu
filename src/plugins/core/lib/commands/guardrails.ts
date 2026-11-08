import type { CommandPlugin } from "./types";

export const guardrailsCommand: CommandPlugin = {
  name: "guardrails",
  description: "Arm the guardrail domains",
  icon: "shield",
  target: "guardrails",
};
