import type {
  ExtensionAPI,
  ExtensionFactory,
} from "@earendil-works/pi-coding-agent";

import { blockReasonOf, evaluateToolCall, warmGuardrails } from "./engine";
import { registerRulesFromDisk, rulesDirDisplay } from "./rulesFile";
import { guardrailsStore } from "./store";
import { subscribeEngine } from "./treeSitter/runtime";

let started = false;

export function reloadGuardrails(): {
  dir: string;
  files: number;
  errors: string[];
} {
  const loaded = registerRulesFromDisk();
  const rules = {
    dir: rulesDirDisplay(),
    files: loaded.files.length,
    errors: loaded.errors,
  };
  guardrailsStore.setRules(rules);
  return rules;
}

export function startGuardrails(): void {
  if (started) return;
  started = true;
  subscribeEngine((state) => guardrailsStore.setEngine(state));
  reloadGuardrails();
}

export const guardrailsExtension: ExtensionFactory = (pi: ExtensionAPI) => {
  startGuardrails();

  pi.on("session_start", () => {
    void warmGuardrails();
  });

  pi.on("tool_call", async (event) => {
    const evaluation = await evaluateToolCall({
      toolName: event.toolName,
      toolCallId: event.toolCallId,
      input: event.input as Record<string, unknown>,
    });
    guardrailsStore.record(evaluation.hits);
    const primary = evaluation.primary;
    if (primary === null) return undefined;
    return { block: true, reason: blockReasonOf(primary) };
  });
};
