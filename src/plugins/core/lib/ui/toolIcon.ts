import type { IconName } from "adwaita-gpuix";

export const TOOL_ICONS: Record<string, IconName> = {
  read: "description",
  bash: "terminal",
  edit: "editDocument",
  write: "noteAdd",
  "ask-user": "help",
  "search-duckduckgo": "search",
  "guardrails-test": "rule",
  "guardrails-fixture-update": "ruleSettings",
  "guardrails-coverage": "queryStats",
  "vcs-log": "list",
  "vcs-file-diff": "difference",
  "vcs-file-history": "history",
  "vcs-file-history-show": "description",
  "vcs-conflicts": "merge",
  "vcs-oplog": "changeHistory",
  "vcs-describe": "article",
  "vcs-file-split": "verticalSplit",
  "vcs-hunk-list": "layers",
  "vcs-hunk-split": "callSplit",
  "code-complexity": "analytics",
  "code-dead-code": "sweep",
  "code-duplicates": "contentCopy",
  "code-review": "rateReview",
  "code-symbol-inspect": "category",
  "code-symbol-references": "accountTree",
  "openui-prompt": "libraryBooks",
  "openui-library": "category",
  "openui-validate": "factCheck",
  "openui-render": "widgets",
  "openui-stream": "stream",
  "openui-state": "visibility",
  "openui-events": "touchApp",
  "openui-tools": "inventory",
  "openui-list": "viewArray",
  "openui-switch": "browseGallery",
  "openui-clear": "clearAll",
};

export function toolIconOf(name: string): IconName {
  return TOOL_ICONS[name.toLowerCase()] ?? "terminal";
}
