import { type ReactNode } from "react";
import type { EventPayload } from "@gpuix/native";
import { type MuTheme } from "../theme";
import { parseKey } from "../keys";
import { getKeybindings } from "../keybindings/manager";

export type WindowKeyListener = (event: EventPayload) => void;

const NEW_WINDOW_BINDING = "ui.newWindow";
const NEW_SESSION_BINDING = "ui.newSession";
const DEBUG_BINDING = "ui.debug";

function matchesBinding(event: EventPayload, bindingId: string): boolean {
  if (event.isHeld === true) return false;
  const parsed = parseKey(getKeybindings().get(bindingId));
  const mods = event.modifiers;
  return (
    (event.key ?? "").toLowerCase() === parsed.key &&
    mods !== undefined &&
    mods.ctrl === parsed.ctrl &&
    mods.shift === parsed.shift &&
    mods.alt === parsed.alt &&
    mods.cmd === parsed.cmd
  );
}

export interface AppWindowProps {
  children?: ReactNode;

  theme: MuTheme;
  onDebug?: () => void;
}

let listeners: WindowKeyListener[] = [];
let debugHandler: (() => void) | undefined;
let newSessionHandler: (() => void) | undefined;
let newWindowHandler: (() => void) | undefined;
let keyHandler: ((event: EventPayload) => void) | undefined;

export function addInputListener(listener: WindowKeyListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function setDebugHandler(fn?: () => void): void {
  debugHandler = fn;
}

export function setNewSessionHandler(fn?: () => void): void {
  newSessionHandler = fn;
}

export function setNewWindowHandler(fn?: () => void): void {
  newWindowHandler = fn;
}

export function createWindowKeyHandler(): (event: EventPayload) => void {
  if (!keyHandler) {
    keyHandler = (event: EventPayload) => {
      if (matchesBinding(event, DEBUG_BINDING)) {
        debugHandler?.();
        return;
      }
      if (matchesBinding(event, NEW_WINDOW_BINDING)) {
        newWindowHandler?.();
        return;
      }
      if (matchesBinding(event, NEW_SESSION_BINDING)) {
        newSessionHandler?.();
        return;
      }
      for (const listener of listeners) listener(event);
    };
  }
  return keyHandler;
}
