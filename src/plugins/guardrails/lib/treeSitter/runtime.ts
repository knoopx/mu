import { readFileSync } from "node:fs";
import { Language, Parser } from "web-tree-sitter";

import { PARSE_BUDGET_MS } from "../../constants";
import type { GuardrailEngineState, GuardrailLanguage } from "../../types";
import { CORE_WASM_PATH, GRAMMAR_ASSETS, grammarAssetOf } from "./grammar";

let boot: Promise<void> | undefined;
let bootMs = 0;
let epoch = 0;
let phase: GuardrailEngineState["phase"] = "idle";
let failure: string | undefined;
const grammars = new Map<GuardrailLanguage, Language>();
const listeners = new Set<(state: GuardrailEngineState) => void>();

function engineState(): GuardrailEngineState {
  return {
    phase,
    ...(failure === undefined ? {} : { error: failure }),
    bootMs,
    grammars: [...grammars.keys()],
  };
}

export function subscribeEngine(
  listener: (state: GuardrailEngineState) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function publish(next: GuardrailEngineState["phase"], error?: string): void {
  phase = next;
  failure = error;
  const state = engineState();
  for (const listener of listeners) listener(state);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function readAsset(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

function bootOnce(): Promise<void> {
  if (boot !== undefined) return boot;
  publish("loading");
  const started = performance.now();
  boot = Parser.init({
    wasmBinary: readAsset(CORE_WASM_PATH),
  })
    .then(() => {
      bootMs = Math.round(performance.now() - started);
      publish("ready");
    })
    .catch((error: unknown) => {
      boot = undefined;
      bootMs = Math.round(performance.now() - started);
      publish("failed", messageOf(error));
    });
  return boot;
}

export async function warmRuntime(
  languages: readonly GuardrailLanguage[] = Object.keys(
    GRAMMAR_ASSETS,
  ) as GuardrailLanguage[],
): Promise<GuardrailEngineState> {
  await bootOnce();
  if (phase !== "ready") return engineState();
  for (const language of languages) {
    await loadGrammar(language).catch(() => undefined);
  }
  return engineState();
}

export async function loadGrammar(
  language: GuardrailLanguage,
): Promise<Language | null> {
  const cached = grammars.get(language);
  if (cached !== undefined) return cached;
  const asset = grammarAssetOf(language);
  if (asset === undefined) return null;
  await bootOnce();
  if (phase !== "ready") return null;
  try {
    const loaded = await Language.load(readAsset(asset));
    grammars.set(language, loaded);
    epoch += 1;
    publish("ready");
    return loaded;
  } catch (error) {
    publish("failed", `${language} grammar: ${messageOf(error)}`);
    return null;
  }
}

export function grammarEpoch(): number {
  return epoch;
}

export function residentGrammar(language: GuardrailLanguage): Language | null {
  return grammars.get(language) ?? null;
}

export interface BudgetedParse {
  tree: ReturnType<Parser["parse"]>;
  timedOut: boolean;
}

export function parseWithinBudget(
  parser: Parser,
  source: string,
  budgetMs = PARSE_BUDGET_MS,
): BudgetedParse {
  const deadline = performance.now() + budgetMs;
  let timedOut = false;
  const tree = parser.parse(source, null, {
    progressCallback: () => {
      if (performance.now() <= deadline) return undefined;
      timedOut = true;
      return true as unknown as void;
    },
  });
  return { tree: tree ?? null, timedOut };
}
