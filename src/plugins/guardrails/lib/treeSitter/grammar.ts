import coreWasmPath from "web-tree-sitter/web-tree-sitter.wasm" with { type: "file" };

import bashWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-bash.wasm" with { type: "file" };
import cppWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-cpp.wasm" with { type: "file" };
import csharpWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-c-sharp.wasm" with { type: "file" };
import cssWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-css.wasm" with { type: "file" };
import goWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-go.wasm" with { type: "file" };
import iniWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-ini.wasm" with { type: "file" };
import javaWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-java.wasm" with { type: "file" };
import javascriptWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-javascript.wasm" with { type: "file" };
import phpWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-php.wasm" with { type: "file" };
import powershellWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-powershell.wasm" with { type: "file" };
import pythonWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-python.wasm" with { type: "file" };
import regexWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-regex.wasm" with { type: "file" };
import rubyWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-ruby.wasm" with { type: "file" };
import rustWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-rust.wasm" with { type: "file" };
import tsxWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-tsx.wasm" with { type: "file" };
import typescriptWasmPath from "@vscode/tree-sitter-wasm/wasm/tree-sitter-typescript.wasm" with { type: "file" };

import type { GuardrailLanguage } from "../../types";

export const CORE_WASM_PATH: string = coreWasmPath;

export const GRAMMAR_ASSETS: Record<GuardrailLanguage, string> = {
  bash: bashWasmPath,
  cpp: cppWasmPath,
  csharp: csharpWasmPath,
  css: cssWasmPath,
  go: goWasmPath,
  ini: iniWasmPath,
  java: javaWasmPath,
  javascript: javascriptWasmPath,
  php: phpWasmPath,
  powershell: powershellWasmPath,
  python: pythonWasmPath,
  regex: regexWasmPath,
  ruby: rubyWasmPath,
  rust: rustWasmPath,
  tsx: tsxWasmPath,
  typescript: typescriptWasmPath,
};
export function grammarAssetOf(
  language: GuardrailLanguage,
): string | undefined {
  return GRAMMAR_ASSETS[language];
}
