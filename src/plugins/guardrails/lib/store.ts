import { MAX_PANEL_HITS } from "../constants";
import type {
  GuardrailEngineState,
  GuardrailHit,
  GuardrailsListener,
  GuardrailsSnapshot,
} from "../types";
import { readGuardrailsState, writeGuardrailsState } from "./rulesFile";
import { guardrailDomains } from "./rules";

const EMPTY_ENGINE: GuardrailEngineState = {
  phase: "idle",
  bootMs: 0,
  grammars: [],
};

export class GuardrailsStore {
  private armedAll: boolean;
  private disarmed: Set<string>;
  private hits: GuardrailHit[] = [];
  private engine: GuardrailEngineState = EMPTY_ENGINE;
  private rulesDir: string | null = null;
  private ruleFiles = 0;
  private ruleErrors: string[] = [];
  private listeners = new Set<GuardrailsListener>();
  private snapshot: GuardrailsSnapshot;
  private dirty = true;

  constructor() {
    const saved = readGuardrailsState();
    this.armedAll = saved?.armed ?? true;
    this.disarmed = new Set(saved?.disarmed ?? []);
    this.snapshot = this.build();
  }

  setRules(rules: {
    dir: string;
    files: number;
    errors: readonly string[];
  }): void {
    this.rulesDir = rules.dir;
    this.ruleFiles = rules.files;
    this.ruleErrors = [...rules.errors];
    this.publish();
  }

  private persist(): void {
    writeGuardrailsState({
      armed: this.armedAll,
      disarmed: [...this.disarmed],
    });
  }

  subscribe = (listener: GuardrailsListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): GuardrailsSnapshot => {
    if (this.dirty) {
      this.snapshot = this.build();
      this.dirty = false;
    }
    return this.snapshot;
  };

  isArmed(domain: string): boolean {
    return this.armedAll && !this.disarmed.has(domain);
  }

  record(hits: readonly GuardrailHit[]): void {
    if (hits.length === 0) return;
    this.hits = [...hits.slice().reverse(), ...this.hits].slice(
      0,
      MAX_PANEL_HITS,
    );
    this.publish();
  }

  setEngine(engine: GuardrailEngineState): void {
    if (
      engine.phase === this.engine.phase &&
      engine.bootMs === this.engine.bootMs &&
      engine.error === this.engine.error &&
      engine.grammars.length === this.engine.grammars.length
    )
      return;
    this.engine = engine;
    this.publish();
  }

  toggleDomain(domain: string): string {
    if (this.disarmed.has(domain)) this.disarmed.delete(domain);
    else this.disarmed.add(domain);
    this.publish();
    return this.isArmed(domain)
      ? `Guardrails armed · ${domain}`
      : `Guardrails disarmed · ${domain}`;
  }

  clearHits(): string {
    if (this.hits.length === 0) return "No guardrail hits to clear";
    this.hits = [];
    this.publish();
    return "Guardrail hits cleared";
  }

  hitFor(toolCallId: string): GuardrailHit | undefined {
    return this.hits.find((hit) => hit.toolCallId === toolCallId);
  }

  private build(): GuardrailsSnapshot {
    const domains = guardrailDomains();
    return {
      armed: this.armedAll,
      disarmed: [...this.disarmed],
      hits: this.hits,
      engine: this.engine,
      domainCount: domains.length,
      rulesDir: this.rulesDir,
      ruleFiles: this.ruleFiles,
      ruleErrors: this.ruleErrors,
    };
  }

  private publish(): void {
    this.dirty = true;
    this.persist();
    for (const listener of this.listeners) listener();
  }
}

export const guardrailsStore = new GuardrailsStore();
