import { AgentBridge } from "../agent/agentService";
import type { SlashCommand } from "../../../../autocomplete";
import type { ComposerTarget } from "../composer/mode";

export interface CommandPlugin extends SlashCommand {
  target?: ComposerTarget;
}

type CommandBridge = AgentBridge;
