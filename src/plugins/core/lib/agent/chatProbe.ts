import type { AgentSnapshot } from "./agentService";

export interface ChatProbe {
  submit(text: string): void;

  resume(path: string): void;
  interrupt(): void;
  snapshot(): AgentSnapshot & { streaming: boolean; items: number };
}

export let chatProbe: ChatProbe | null = null;

export function setChatProbe(probe: ChatProbe | null): void {
  chatProbe = probe;
}
