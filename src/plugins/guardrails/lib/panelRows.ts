import {
  getFileIcon,
  getFileIconColor,
  type IconName,
} from "adwaita-gpuix";
import type {
  ComposerPanelRow,
  ComposerRowFigure,
} from "../../core/components/composer/Composer";
import type {
  GuardrailEngineState,
  GuardrailLanguage,
  GuardrailsSnapshot,
} from "../types";
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


/**
 * The engine as the panel says it: one state word.
 *
 * The full label names every grammar the parser booted, which is what a suite
 * run's answer wants and what a status line one row high cannot hold: the chain
 * of figures ran past the panel's width and was cut mid-word. A cut that is not
 * marked is worse than a figure left out.
 */
export function enginePanelLabel(engine: GuardrailEngineState): string {
  switch (engine.phase) {
    case "ready":
      return engine.grammars.length === 0 ? "parser, no grammar" : "parser ready";
    default:
      return engineLabel(engine);
  }
}


export const domainArmed = (
  snapshot: GuardrailsSnapshot,
  domain: string,
): boolean => snapshot.armed && !snapshot.disarmed.includes(domain);

function armedDomainCount(snapshot: GuardrailsSnapshot): number {
  return guardrailDomains().filter((domain) => domainArmed(snapshot, domain))
    .length;
}

const ruleCountText = (count: number): string =>
  `${count} ${count === 1 ? "rule" : "rules"}`;

const GRAMMAR_FILE: Partial<Record<GuardrailLanguage, string>> = {
  bash: "rule.sh",
  cpp: "rule.cpp",
  csharp: "rule.cs",
  css: "rule.css",
  go: "rule.go",
  java: "rule.java",
  javascript: "rule.js",
  php: "rule.php",
  python: "rule.py",
  ruby: "rule.rb",
  rust: "rule.rs",
  tsx: "rule.tsx",
  typescript: "rule.ts",
};

const GRAMMAR_ICON: Partial<Record<GuardrailLanguage, IconName>> = {
  ini: "settings",
  powershell: "terminal",
  regex: "token",
};

function grammarFigure(language: GuardrailLanguage): ComposerRowFigure {
  const file = GRAMMAR_FILE[language];
  const icon =
    file === undefined
      ? (GRAMMAR_ICON[language] ?? "description")
      : getFileIcon(file);
  const color = file === undefined ? null : getFileIconColor(file);
  return { icon, ...(color === null ? {} : { color }), text: "" };
}

interface DomainRow {
  domain: string;
  count: number;
  languages: GuardrailLanguage[];
}

function domainRows(): DomainRow[] {
  const rules = guardrailRules();
  return guardrailDomains().map((domain) => {
    const inDomain = rules.filter((rule) => rule.domain === domain);
    return {
      domain,
      count: inDomain.length,
      languages: [...new Set(inDomain.map((rule) => rule.language))],
    };
  });
}

const searchable = (row: DomainRow): string =>
  `${row.domain} ${ruleCountText(row.count)} ${row.languages.join(" ")}`;

export function guardrailPanelRows(
  snapshot: GuardrailsSnapshot,
  query = "",
): ComposerPanelRow[] {
  const rows = domainRows();
  const needle = query.trim().toLowerCase();
  const visible =
    needle === ""
      ? rows
      : rows.filter((row) => searchable(row).toLowerCase().includes(needle));
  return visible.map((entry) => {
    const figures: ComposerRowFigure[] = [
      { text: ruleCountText(entry.count) },
      ...entry.languages.map((language) => grammarFigure(language)),
    ];
    return {
      kind: "option",
      key: `domain:${entry.domain}`,
      label: entry.domain,
      figures,
      picked: domainArmed(snapshot, entry.domain),
      icon: "folder",
    };
  });
}

export function toggleGuardrail(key: string): string {
  if (key.startsWith("domain:"))
    return guardrailsStore.toggleDomain(key.slice("domain:".length));
  return "Nothing to arm here";
}

export function guardrailsEmptyText(snapshot: GuardrailsSnapshot): string {
  return snapshot.ruleFiles === 0
    ? `No rules — write <domain>.json in ${snapshot.rulesDir ?? "mu's guardrails directory"}`
    : "No guardrail domain matches";
}

export function guardrailStatusText(
  snapshot: GuardrailsSnapshot,
  query: string,
  visible: number,
): string {
  const blocked = snapshot.hits.filter((hit) => hit.blocked).length;
  const on = armedDomainCount(snapshot);
  const total = snapshot.domainCount;
  const domains = `${snapshot.domainCount} ${
    snapshot.domainCount === 1 ? "domain" : "domains"
  }`;
  return [
    `guardrails · ${on} of ${domains} armed`,
    query.trim() === "" ? `${visible} rows` : `${visible} of ${total} rows`,
    blocked === 0
      ? "no calls stopped yet"
      : `${blocked} ${blocked === 1 ? "call" : "calls"} stopped`,
    // A rule file that parsed is not news, so the chain only carries the files
    // when one of them refuses; the engine says its state and nothing else.
    snapshot.ruleFiles === 0
      ? `no rules in ${snapshot.rulesDir ?? "mu's guardrails directory"}`
      : snapshot.ruleErrors.length === 0
        ? ""
        : `${snapshot.ruleErrors.length} of ${snapshot.ruleFiles} rule ${
            snapshot.ruleErrors.length === 1 ? "file refuses" : "files refuse"
          }`,
    enginePanelLabel(snapshot.engine),
  ]
    .filter((part) => part !== "")
    .join(" · ");
}
