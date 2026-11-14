import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useAdwaita } from "adwaita-gpuix";

import { warmGuardrails } from "../lib/engine";
import { rulesVersion } from "../lib/rules";
import {
  guardrailPanelRows,
  guardrailsEmptyText,
  guardrailStatusText,
  toggleGuardrail,
} from "../lib/panelRows";
import { guardrailsStore } from "../lib/store";
import type { GuardrailsPanelApi, GuardrailsSnapshot } from "../types";

export function useGuardrailsSnapshot(): GuardrailsSnapshot {
  return useSyncExternalStore(
    guardrailsStore.subscribe,
    guardrailsStore.getSnapshot,
    guardrailsStore.getSnapshot,
  );
}

export function useGuardrailsPanel(
  query: string,
  enabled: boolean,
): GuardrailsPanelApi {
  const snapshot = useGuardrailsSnapshot();

  const theme = useAdwaita();

  const version = rulesVersion();

  useEffect(() => {
    if (!enabled) return;
    void warmGuardrails();
  }, [enabled]);

  const rows = useMemo(
    () => guardrailPanelRows(snapshot, theme, query),
    [snapshot, theme, query, version],
  );
  const statusText = useMemo(
    () => guardrailStatusText(snapshot, query, rows.length),
    [snapshot, query, rows.length],
  );
  const toggle = useCallback((key: string): string => toggleGuardrail(key), []);
  const emptyText = guardrailsEmptyText(snapshot);

  return { snapshot, rows, statusText, emptyText, toggle };
}
