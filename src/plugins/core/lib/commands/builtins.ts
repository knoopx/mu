import type { SlashCommand } from "../../../../autocomplete";

export const builtinCommands: SlashCommand[] = [
  {
    name: "model",
    description: "Load a model by name",
    icon: "layers",
    args: "name",
  },
  {
    name: "thinking",
    description: "How long the model thinks first",
    icon: "autoAwesome",
    args: "off | low | medium | high",
  },
  {
    name: "compact",
    description: "Compact the session context",
    icon: "inbox",
  },
  { name: "new", description: "Start a new chat", icon: "add" },
];
