import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import { warmGuardrails } from "../lib/engine";
import { rulesVersion } from "../lib/rules";
import {
  guardrailPanelRows,
  guardrailStatusText,
  toggleGuardrail,
} from "../lib/panelRows";
import { guardrailsStore } from "../lib/store";
import type { GuardrailsPanelApi, GuardrailsSnapshot } from "../types";

/**
 * The store, read as React state. The snapshot object is stable until
 * something changes, so a subscription is cheap on the transcript's render path.
 */
export function useGuardrailsSnapshot(): GuardrailsSnapshot {
  return useSyncExternalStore(
    guardrailsStore.subscribe,
    guardrailsStore.getSnapshot,
    guardrailsStore.getSnapshot,
  );
}

/**
 * The panel contract: rows, status line, and the arming switch a pick flips.
 * Opening the panel boots the parser, so the panel can never show an idle
 * engine as if it were healthy.
 */
export function useGuardrailsPanel(
  query: string,
  enabled: boolean,
): GuardrailsPanelApi {
  const snapshot = useGuardrailsSnapshot();
  // A registry swap does not touch the snapshot, so the version is what tells
  // the panel its rows went stale.
  const version = rulesVersion();

  useEffect(() => {
    if (!enabled) return;
    void warmGuardrails();
  }, [enabled]);

  const rows = useMemo(
    () => guardrailPanelRows(snapshot, query),
    [snapshot, query, version],
  );
  const statusText = useMemo(
    () => guardrailStatusText(snapshot, query, rows.length),
    [snapshot, query, rows.length],
  );
  const toggle = useCallback((key: string): string => toggleGuardrail(key), []);

  return { snapshot, rows, statusText, toggle };
}
