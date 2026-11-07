import type { ComposerPanelRow } from "../../core/components/composer/Composer";
import { MAX_PANEL_HITS, MAX_PANEL_RULES } from "../constants";
import type { GuardrailEngineState, GuardrailsSnapshot } from "../types";
import { guardrailDomains, guardrailRules } from "./rules";
import { guardrailsStore } from "./store";

export function engineLabel(engine: GuardrailEngineState): string {
  switch (engine.phase) {
    case "idle":
      return "parser idle";
    case "loading":
      return "parser loading…";
    case "ready":
      return `parser ready in ${engine.bootMs}ms · ${
        engine.grammars.length === 0
          ? "no grammar yet"
          : engine.grammars.join(", ")
      }`;
    case "failed":
      return `parser failed: ${engine.error ?? "unknown"}`;
    case "unavailable":
      return "parser unavailable";
  }
}

function timeAgo(at: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.round(minutes / 60)}h ago`;
}

function clip(text: string, width: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= width ? flat : `${flat.slice(0, width - 1)}…`;
}

function matches(query: string, row: ComposerPanelRow): boolean {
  if (query.trim() === "") return true;
  const needle = query.trim().toLowerCase();
  const haystack = [
    row.kind === "option" ? row.label : "",
    row.kind === "option" ? (row.caption ?? "") : "",
    row.kind === "option" ? (row.description ?? "") : "",
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

export function guardrailPanelRows(
  snapshot: GuardrailsSnapshot,
  query = "",
  now = Date.now(),
): ComposerPanelRow[] {
  const rules = guardrailRules();
  const domains = guardrailDomains();
  const rows: ComposerPanelRow[] = [];

  rows.push({
    kind: "option",
    key: "arm:all",
    label: "All guardrails",
    caption: snapshot.rulesPending
      ? "no rules"
      : `${snapshot.ruleCount} rules in ${snapshot.domainCount} ${
          snapshot.domainCount === 1 ? "domain" : "domains"
        }`,
    description: snapshot.armed
      ? "armed — a match blocks the call"
      : "disarmed — calls run unguarded",
    picked: snapshot.armed,
    icon: snapshot.armed ? "shield" : "gppBad",
  });

  if (snapshot.ruleFiles === 0)
    rows.push({
      kind: "option",
      key: "rules:dir",
      label: "no rules",
      caption: snapshot.rulesDir ?? "mu's guardrails directory",
      description:
        "write <domain>.json here; the suite goes beside it as <domain>.fixtures.json",
      picked: false,
      icon: "folder",
    });

  for (const domain of domains) {
    const inDomain = rules.filter((rule) => rule.domain === domain);
    rows.push({
      kind: "option",
      key: `domain:${domain}`,
      label: domain,
      caption: `${inDomain.length} ${inDomain.length === 1 ? "rule" : "rules"}`,
      description: [...new Set(inDomain.map((rule) => rule.language))].join(
        ", ",
      ),
      picked: snapshot.armed && !snapshot.disarmed.includes(domain),
      icon: "folder",
    });
  }

  for (const rule of rules.slice(0, MAX_PANEL_RULES)) {
    rows.push({
      kind: "option",
      key: `rule:${rule.id}`,
      label: clip(rule.message, 76),
      caption: rule.id,
      description: `${rule.domain} · ${rule.language}`,
      picked: snapshot.armed && !snapshot.disarmed.includes(rule.domain),
      icon: "textSearch",
    });
  }
  if (rules.length > MAX_PANEL_RULES)
    rows.push({
      kind: "option",
      key: "more:rules",
      label: `${rules.length - MAX_PANEL_RULES} more rules`,
      caption: "type to filter",
      picked: false,
      icon: "moreHoriz",
    });

  for (const hit of snapshot.hits.slice(0, MAX_PANEL_HITS)) {
    rows.push({
      kind: "option",
      key: `hit:${hit.toolCallId}`,
      label: `${hit.blocked ? "blocked" : "matched"} ${hit.tool}.${hit.field} · ${hit.ruleId}`,
      caption: clip(hit.matchText, 64),
      description: `${timeAgo(hit.at, now)} · ${hit.engineMs}ms`,
      picked: false,
      icon: hit.blocked ? "block" : "visibility",
      tabular: true,
    });
  }

  return rows.filter((row) => matches(query, row));
}

export function toggleGuardrail(key: string): string {
  if (key === "arm:all")
    return guardrailsStore.setArmed(!guardrailsStore.getSnapshot().armed);
  if (key.startsWith("domain:"))
    return guardrailsStore.toggleDomain(key.slice("domain:".length));
  if (key.startsWith("rule:")) {
    const id = key.slice("rule:".length);
    const rule = guardrailRules().find((candidate) => candidate.id === id);
    return rule === undefined
      ? `Unknown guardrail rule ${id}`
      : guardrailsStore.toggleDomain(rule.domain);
  }
  if (key.startsWith("hit:"))
    return "Hits are a log — arm a domain to change what blocks";
  if (key === "rules:dir")
    return `Rules are files — write <domain>.json in ${guardrailsStore.getSnapshot().rulesDir ?? "mu's guardrails directory"}`;
  return "Nothing to arm here";
}

export function guardrailStatusText(
  snapshot: GuardrailsSnapshot,
  query: string,
  visible: number,
): string {
  const blocked = snapshot.hits.filter((hit) => hit.blocked).length;
  const total =
    snapshot.ruleCount + snapshot.domainCount + snapshot.hits.length + 1;
  return [
    `guardrails ${snapshot.armed ? "armed" : "disarmed"}`,
    query.trim() === "" ? `${visible} rows` : `${visible} of ${total} rows`,
    blocked === 0
      ? "no calls stopped yet"
      : `${blocked} ${blocked === 1 ? "call" : "calls"} stopped`,
    snapshot.ruleFiles === 0
      ? `no rules in ${snapshot.rulesDir ?? "mu's guardrails directory"}`
      : snapshot.ruleErrors.length === 0
        ? `${snapshot.ruleFiles} ${snapshot.ruleFiles === 1 ? "file" : "files"} read`
        : `${snapshot.ruleErrors.length} of ${snapshot.ruleFiles} rule ${
            snapshot.ruleErrors.length === 1 ? "file refuses" : "files refuse"
          }`,
    engineLabel(snapshot.engine),
  ].join(" · ");
}
