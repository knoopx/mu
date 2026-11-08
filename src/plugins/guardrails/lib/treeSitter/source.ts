import { extname } from "node:path";

import {
  GUARDED_COMMAND_TOOLS,
  GUARDED_FILE_TOOLS,
  MAX_GUARDED_BYTES,
} from "../../constants";
import {
  COMMAND_INPUT_KEYS,
  FILE_TEXT_INPUT_KEYS,
  PATH_INPUT_KEYS,
} from "../../../core/lib/agent/toolInput";
import type { GuardrailLanguage } from "../../types";

export interface GuardedSource {
  tool: string;
  language: GuardrailLanguage;

  field: string;

  text: string;

  path?: string;
}

const COMMAND_LANGUAGES: Record<string, GuardrailLanguage> = {
  bash: "bash",
  shell: "bash",
  terminal: "bash",
  exec: "bash",
  run: "bash",
};

const EXTENSION_LANGUAGES: Record<string, GuardrailLanguage> = {
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "bash",
  ".py": "python",
  ".pyi": "python",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".ts": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".tsx": "tsx",
  ".rs": "rust",
  ".go": "go",
  ".rb": "ruby",
  ".java": "java",
  ".php": "php",
  ".css": "css",
  ".regex": "regex",
  ".ini": "ini",
  ".cfg": "ini",
  ".conf": "ini",
  ".ps1": "powershell",
  ".psm1": "powershell",
  ".c": "cpp",
  ".h": "cpp",
  ".cc": "cpp",
  ".cpp": "cpp",
  ".cxx": "cpp",
  ".hpp": "cpp",
  ".cs": "csharp",
};

const normalizedTool = (toolName: string): string =>
  toolName.trim().toLowerCase();

export function languageOfPath(path: string): GuardrailLanguage | null {
  const extension = extname(path.trim()).toLowerCase();
  return EXTENSION_LANGUAGES[extension] ?? null;
}

const stringKey = (
  input: Record<string, unknown>,
  keys: readonly string[],
): { key: string; value: string } | null => {
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim() !== "") return { key, value };
  }
  return null;
};

const usable = (text: string): boolean => text.length <= MAX_GUARDED_BYTES;

export function guardedSourcesOf(
  toolName: string,
  input: Record<string, unknown> | undefined,
): GuardedSource[] {
  if (input === undefined) return [];
  const tool = normalizedTool(toolName);
  const sources: GuardedSource[] = [];

  const language = COMMAND_LANGUAGES[tool];
  if (language !== undefined) {
    for (const key of COMMAND_INPUT_KEYS) {
      const value = input[key];
      if (typeof value === "string" && value.trim() !== "" && usable(value))
        sources.push({ tool, language, field: key, text: value });
    }
    return sources;
  }

  if (GUARDED_FILE_TOOLS.includes(tool)) {
    const path = stringKey(input, PATH_INPUT_KEYS);
    if (path === null) return sources;
    const fileLanguage = languageOfPath(path.value);
    if (fileLanguage === null) return sources;
    for (const key of FILE_TEXT_INPUT_KEYS) {
      const value = input[key];
      if (typeof value === "string" && value.trim() !== "" && usable(value))
        sources.push({
          tool,
          language: fileLanguage,
          field: key,
          text: value,
          path: path.value,
        });
    }
  }
  return sources;
}

export function guardedSourceOf(
  toolName: string,
  input: Record<string, unknown> | undefined,
): GuardedSource | null {
  return guardedSourcesOf(toolName, input)[0] ?? null;
}

export function isGuardedTool(toolName: string): boolean {
  const tool = normalizedTool(toolName);
  return (
    GUARDED_COMMAND_TOOLS.includes(tool) || GUARDED_FILE_TOOLS.includes(tool)
  );
}

export const guardedFieldsOf = (toolName: string): readonly string[] => {
  const tool = normalizedTool(toolName);
  if (GUARDED_COMMAND_TOOLS.includes(tool)) return COMMAND_INPUT_KEYS;
  if (GUARDED_FILE_TOOLS.includes(tool)) return FILE_TEXT_INPUT_KEYS;
  return [];
};
