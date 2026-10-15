import type { KeybindingConflict, KeybindingDefinitions } from "./definitions";
import { APP_KEYBINDINGS } from "./definitions";
import { keyHint, matchesKey, type KeyEvent } from "../keys";

export interface KeybindingsConfig {
  bindings?: Record<string, string>;
}
export interface Keybindings {
  get: (id: string) => string;
  hint: (id: string) => string;
  matches: (event: KeyEvent, id: string) => boolean;
}

export class KeybindingsManager implements Keybindings {
  private readonly keys: Map<string, string>;

  constructor(definitions: KeybindingDefinitions, config?: KeybindingsConfig) {
    this.keys = new Map<string, string>();
    for (const entries of Object.values(definitions)) {
      for (const entry of entries) this.keys.set(entry.id, entry.key);
    }
    for (const [id, key] of Object.entries(config?.bindings ?? {}))
      this.keys.set(id, key);
  }

  get(id: string): string {
    const key = this.keys.get(id);
    if (key === undefined)
      throw new Error(`KeybindingsManager: unknown binding: ${id}`);
    return key;
  }

  matches(event: KeyEvent, id: string): boolean {
    return matchesKey(event, this.get(id));
  }

  hint(id: string): string {
    return keyHint(this.get(id));
  }

  conflicts(): KeybindingConflict[] {
    const byKey = new Map<string, string[]>();
    for (const [id, key] of this.keys) {
      const ids = byKey.get(key);
      if (ids === undefined) byKey.set(key, [id]);
      else ids.push(id);
    }
    const out: KeybindingConflict[] = [];
    for (const [key, ids] of byKey) {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++)
          out.push({ id: ids[i], key, with: ids[j] });
      }
    }
    return out;
  }
}

let globalManager: KeybindingsManager | undefined;

function setKeybindings(
  definitions: KeybindingDefinitions,
  config?: KeybindingsConfig,
): void {
  globalManager = new KeybindingsManager(definitions, config);
}

export function getKeybindings(): KeybindingsManager {
  if (globalManager === undefined)
    globalManager = new KeybindingsManager(APP_KEYBINDINGS);
  return globalManager;
}

export function keybindingHint(id: string): string {
  return getKeybindings().hint(id);
}
