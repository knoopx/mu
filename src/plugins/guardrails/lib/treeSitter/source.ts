import { extname } from "node:path";

import { GUARDED_FILE_TOOLS, MAX_GUARDED_BYTES } from "../../constants";
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

/** The text one call carries under each of the keys that carries text at all. */
function textFieldsOf(
  input: Record<string, unknown>,
  keys: readonly string[],
): { field: string; text: string }[] {
  const fields: { field: string; text: string }[] = [];
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim() !== "" && usable(value))
      fields.push({ field: key, text: value });
  }
  return fields;
}

/** A command tool's sources: the command it was given, in bash. */
function commandSources(
  tool: string,
  language: GuardrailLanguage,
  input: Record<string, unknown>,
): GuardedSource[] {
  return textFieldsOf(input, COMMAND_INPUT_KEYS).map((entry) => ({
    tool,
    language,
    field: entry.field,
    text: entry.text,
  }));
}

/** A file tool's sources: the text it writes, in the grammar its path names. */
function fileSources(
  tool: string,
  input: Record<string, unknown>,
): GuardedSource[] {
  const path = stringKey(input, PATH_INPUT_KEYS);
  if (path === null) return [];
  const language = languageOfPath(path.value);
  if (language === null) return [];
  return textFieldsOf(input, FILE_TEXT_INPUT_KEYS).map((entry) => ({
    tool,
    language,
    field: entry.field,
    text: entry.text,
    path: path.value,
  }));
}

export function guardedSourcesOf(
  toolName: string,
  input: Record<string, unknown> | undefined,
): GuardedSource[] {
  if (input === undefined) return [];
  const tool = normalizedTool(toolName);

  const language = COMMAND_LANGUAGES[tool];
  if (language !== undefined) return commandSources(tool, language, input);
  if (GUARDED_FILE_TOOLS.includes(tool)) return fileSources(tool, input);
  return [];
}
