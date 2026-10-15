import {
  type AgentAvailableModel,
  AgentBridge,
  type AgentModel,
  type ThinkingLevel,
} from "../../src/plugins/core/lib/agent/agentService";
import type { ChatSessionMeta } from "../../src/plugins/core/lib/session/chatSession";

export const LOCAL_MODEL = {
  provider: "local",
  id: "ostfralla/Qwen3.8-27B",
  name: "Qwen3.8 27B · llama.cpp",
} as unknown as AgentModel;

const model = (
  provider: string,
  id: string,
  name: string,
): AgentAvailableModel =>
  ({ provider, id, name }) as unknown as AgentAvailableModel;

export const AVAILABLE_MODELS: AgentAvailableModel[] = [
  model("local", "ostfralla/Qwen3.8-27B", "Qwen3.8 27B · llama.cpp"),
  model("openrouter", "anthropic/claude-sonnet-4.5", "Claude Sonnet 4.5"),
  model("openai-codex", "gpt-5.3-codex", "GPT-5.3-Codex"),
  model("openrouter", "google/gemini-3-pro", "Gemini 3 Pro"),
  model("deepseek", "deepseek-v4-pro", "DeepSeek V4 Pro"),
];

export const MOCK_BRIDGE = {
  model: LOCAL_MODEL,
  thinkingLevel: "xhigh" as ThinkingLevel,
  availableModels: AVAILABLE_MODELS,
  thinkingLevels: [
    "off",
    "low",
    "medium",
    "high",
    "xhigh",
    "max",
  ] as ThinkingLevel[],
} as unknown as AgentBridge;

export const STAGE_MODEL = "local/ostfralla/Qwen3.8-27B";

export const STAGE_THINKING: ThinkingLevel = "xhigh";

export const LOCAL_WINDOW = 131_072;

export const CLOUD_WINDOW = 200_000;

export const sessionMeta = (
  model: string,
  thinking: ThinkingLevel,
  contextUsed: number,
  contextTotal: number,
): ChatSessionMeta => ({ model, thinking, contextUsed, contextTotal });

export const sceneContext = (
  contextUsed: number,
  contextTotal: number = LOCAL_WINDOW,
): ChatSessionMeta =>
  sessionMeta(STAGE_MODEL, STAGE_THINKING, contextUsed, contextTotal);

export const contextAtPercent = (
  percent: number,
  contextTotal: number = LOCAL_WINDOW,
): ChatSessionMeta =>
  sceneContext(Math.round((contextTotal * percent) / 100), contextTotal);

export const CONTEXT_WARN_SESSION: ChatSessionMeta = contextAtPercent(74);

export const CONTEXT_FULL_SESSION: ChatSessionMeta = contextAtPercent(93);

export const CLOUD_SESSION: ChatSessionMeta = sessionMeta(
  "openrouter/anthropic/claude-sonnet-4.5",
  "high",
  128_600,
  CLOUD_WINDOW,
);
