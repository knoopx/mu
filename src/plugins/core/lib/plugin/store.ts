/**
 * Which plugins the user has switched off.
 *
 * A plugin's arming is the user's file, never the project's and never something
 * the agent can flip — the same line guardrails draws, for the same reason: a
 * capability the agent could disarm is a capability the user never had. The state
 * lives in `$XDG_STATE_HOME/mu/plugins.json`, and it is read once, before the host
 * is built, because the host's slots are what the app's shape is: a tool taken
 * away mid-session would leave the system prompt, the open panels and the keymap
 * each remembering a different app. So the panel says plainly that a switch
 * applies at the next start.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { muPathUnder, muStateDir, displayPath } from "../utils/paths";

/**
 * The one plugin that cannot be switched off.
 *
 * core registers the window's own surfaces — the model and thinking panels, the
 * session list, path completion. Turning it off would not give the user a smaller
 * app, it would give them a window with no way to pick a model, which is not a
 * choice anyone meant to make.
 */
export const ALWAYS_ARMED = "core";

export interface PluginArmState {
  disabled: string[];
}

export const pluginArmPath = (env: NodeJS.ProcessEnv = process.env): string =>
  muPathUnder(muStateDir(env), "plugins.json");

/** The user's file, or nothing when it is absent or unreadable — an absent file means everything is on. */
export function readPluginArmState(
  env: NodeJS.ProcessEnv = process.env,
): PluginArmState {
  try {
    const raw = JSON.parse(readFileSync(pluginArmPath(env), "utf8")) as unknown;
    const list = (raw as { disabled?: unknown })?.disabled;
    if (!Array.isArray(list)) return { disabled: [] };
    return {
      disabled: list
        .filter(
          (name): name is string =>
            typeof name === "string" && name.trim() !== "",
        )
        .filter((name) => name !== ALWAYS_ARMED),
    };
  } catch {
    return { disabled: [] };
  }
}

export function writePluginArmState(
  state: PluginArmState,
  env: NodeJS.ProcessEnv = process.env,
): void {
  try {
    mkdirSync(muStateDir(env), { recursive: true });
    writeFileSync(
      pluginArmPath(env),
      `${JSON.stringify({ disabled: state.disabled }, null, 2)}\n`,
      "utf8",
    );
  } catch {}
}

type Listener = () => void;

class PluginArmStore {
  private disabled: Set<string>;
  private listeners = new Set<Listener>();
  private snapshot: PluginArmState;

  constructor() {
    this.disabled = new Set(readPluginArmState().disabled);
    this.snapshot = { disabled: [...this.disabled] };
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): PluginArmState => this.snapshot;

  isOn(name: string): boolean {
    return name === ALWAYS_ARMED || !this.disabled.has(name);
  }

  /** every plugin name the user has switched off, for the host that is about to be built */
  disabledNames(): string[] {
    return [...this.disabled];
  }

  /**
   * Flip one plugin and say what happened, in the panel's own words.
   *
   * The wording carries the half the switch cannot do: the app that is running
   * still has what it loaded, so the change belongs to the next start.
   */
  toggle(name: string): string {
    if (name === ALWAYS_ARMED)
      return "core is the window itself — switching it off leaves no way to pick a model";
    if (this.disabled.has(name)) {
      this.disabled.delete(name);
      this.publish();
      return `${name} is armed — restart mu to load it back`;
    }
    this.disabled.add(name);
    this.publish();
    return `${name} is off — restart mu to take its tools and panels away`;
  }

  private publish(): void {
    this.snapshot = { disabled: [...this.disabled] };
    for (const listener of this.listeners) listener();
  }
}

/** The one arming store, read at boot and switched by the plugins panel. */
export const pluginArming = new PluginArmStore();

/** Where the switches are kept, for the panel's status line to name once. */
export const pluginArmFile = (env: NodeJS.ProcessEnv = process.env): string =>
  displayPath(pluginArmPath(env), env);
