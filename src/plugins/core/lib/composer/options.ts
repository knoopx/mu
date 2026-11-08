import type { IconName } from "adwaita-gpuix";
import { AgentBridge, type ThinkingLevel } from "../agent/agentService";
import {
  FileCompletionProvider,
  type SlashCommand,
} from "../../../../autocomplete";
import { keybindingHint } from "../../../../keybindings/manager";
import type { ComposerPanelRow } from "../../components/composer/Composer";
import type { ComposerTarget } from "./mode";

export function matchesQuery(
  query: string,
  ...fields: Array<string | undefined>
): boolean {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return true;
  return fields.some((f) => (f ?? "").toLowerCase().includes(q));
}

export function modelValue(bridge: AgentBridge): string {
  return bridge.model ? `${bridge.model.provider}/${bridge.model.id}` : "";
}

export function asThinkingLevel(value: string): ThinkingLevel {
  return value as ThinkingLevel;
}

export function modelRows(
  bridge: AgentBridge,
  filter: string,
): ComposerPanelRow[] {
  const picked = modelValue(bridge);
  return bridge.availableModels
    .filter((m) => matchesQuery(filter, `${m.provider}/${m.id}`, m.name))
    .map((m) => ({
      kind: "option" as const,
      key: `${m.provider}/${m.id}`,
      label: `${m.provider}/${m.id}`,
      description: m.name,
      picked: `${m.provider}/${m.id}` === picked,
    }));
}

export function thinkingRows(
  bridge: AgentBridge,
  filter: string,
): ComposerPanelRow[] {
  return bridge.thinkingLevels
    .filter((level) => matchesQuery(filter, level))
    .map((level) => ({
      kind: "option" as const,
      key: level,
      label: level,
      picked: level === bridge.thinkingLevel,
    }));
}

export function composerPlaceholder(): string {
  return "Type a message";
}

export const PANEL_PLACEHOLDER: Record<
  ComposerTarget | "commands",
  string | undefined
> = {
  commands: "Type a command name",
  model: "Type a model name",
  thinking: "Type a thinking level",
  session: "Type to filter the project session history",
  file: "Type to filter files in this folder",
  path: "Type a path, Tab completes it",
  changes: undefined,
  tree: "Type to filter this session history",
  theme: "Type a theme name",
  accent: "Type an accent colour name",
  userMessageHistory:
    "Type to search the user messages of every session in this folder",
  guardrails: "Type to filter the guardrail domains",
};

export const panelPlaceholder = (
  panel: ComposerTarget | "commands",
): string | undefined => PANEL_PLACEHOLDER[panel];

const PANEL_NOUNS: Record<string, [string, string]> = {
  commands: ["command", "commands"],
  model: ["model", "models"],
  thinking: ["level", "levels"],
  session: ["session", "sessions"],
  file: ["file", "files"],
  path: ["path", "paths"],
  changes: ["change", "changes"],
  tree: ["point", "points"],
  theme: ["theme", "themes"],
  accent: ["accent colour", "accent colours"],
  userMessageHistory: ["user message", "user messages"],
  guardrails: ["guardrail row", "guardrail rows"],
};

const panelNoun = (
  panel: ComposerTarget | "commands",
  count: number,
): string => {
  const [one, many] = PANEL_NOUNS[panel];
  return count === 1 ? one : many;
};

export function panelStatusText(
  panel: ComposerTarget | "commands",
  visible: number,
  total: number | undefined,
  query = "",
): string {
  if (query.trim().length > 0)
    return total === undefined
      ? `${visible} ${panelNoun(panel, visible)} match`
      : `${visible} of ${total} ${panelNoun(panel, visible)}`;
  return total === undefined
    ? `${visible} ${panelNoun(panel, visible)}`
    : `${total} ${panelNoun(panel, total)}`;
}

export function cappedPanelStatusText(
  panel: ComposerTarget | "commands",
  total: number,
  visible: number,
  query: string,
  cap: number,
  belowCapTail: string,
): string {
  if (query.trim().length > 0)
    return `${visible} of ${total} ${panelNoun(panel, visible)}`;
  const count = `${total} ${panelNoun(panel, total)}`;
  return total >= cap ? `${count} · newest first` : `${count} ${belowCapTail}`;
}

export const commandRow = (command: SlashCommand): ComposerPanelRow => ({
  kind: "command" as const,
  key: command.name,
  name: command.name,
  args: command.args,
  description: command.description,
  icon: command.icon,
});

export function commandRows(
  commands: readonly SlashCommand[],
  filter = "",
): ComposerPanelRow[] {
  return commands
    .filter((command) =>
      matchesQuery(filter, command.name, command.description),
    )
    .map(commandRow);
}

const FILE_ROWS_CAP = 200;

const EXTENSION_ICONS: Record<string, IconName> = {
  ts: "code",
  tsx: "code",
  mts: "code",
  cts: "code",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  rs: "code",
  go: "code",
  py: "science",
  rb: "code",
  php: "code",
  java: "code",
  kt: "code",
  scala: "code",
  swift: "code",
  c: "code",
  h: "code",
  cc: "code",
  cpp: "code",
  cxx: "code",
  hpp: "code",
  cu: "code",
  cs: "code",
  dart: "code",
  lua: "code",
  zig: "code",
  ex: "code",
  exs: "code",
  erl: "code",
  hs: "code",
  nim: "code",
  r: "code",
  nix: "snowflake",
  vue: "code",
  svelte: "code",
  astro: "code",
  html: "html",
  xhtml: "html",
  xml: "code",
  css: "css",
  scss: "css",
  sass: "css",
  less: "css",
  graphql: "code",
  gql: "code",
  prisma: "code",
  json: "fileJson",
  jsonc: "fileJson",
  json5: "fileJson",
  jsonl: "fileJson",
  ndjson: "fileJson",
  yaml: "dataObject",
  yml: "dataObject",
  toml: "settingsApplications",
  ini: "settingsApplications",
  conf: "settingsApplications",
  cfg: "settingsApplications",
  config: "settingsApplications",
  properties: "settingsApplications",
  env: "settingsApplications",
  lock: "key",
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
  rst: "article",
  adoc: "article",
  txt: "article",
  text: "article",
  log: "article",
  pdf: "pictureAsPdf",
  epub: "article",
  doc: "article",
  docx: "article",
  odt: "article",
  csv: "csv",
  tsv: "table",
  xls: "table",
  xlsx: "table",
  parquet: "table",
  png: "image",
  jpg: "image",
  jpeg: "image",
  gif: "image",
  webp: "image",
  bmp: "image",
  ico: "image",
  tiff: "image",
  avif: "image",
  svg: "image",
  mp3: "audioFile",
  wav: "audioFile",
  flac: "audioFile",
  ogg: "audioFile",
  m4a: "audioFile",
  mp4: "movie",
  webm: "movie",
  mov: "movie",
  mkv: "movie",
  zip: "folderZip",
  tar: "folderZip",
  gz: "folderZip",
  tgz: "folderZip",
  bz2: "folderZip",
  xz: "folderZip",
  "7z": "folderZip",
  jar: "folderZip",
  sh: "terminal",
  bash: "terminal",
  zsh: "terminal",
  fish: "terminal",
  nu: "terminal",
  ps1: "terminal",
  bat: "terminal",
  cmd: "terminal",
  key: "key",
  pem: "key",
  crt: "key",
  cert: "key",
  gpg: "key",
  db: "database",
  sqlite: "database",
  sqlite3: "database",
  so: "storage",
  dylib: "storage",
  dll: "storage",
  exe: "storage",
  bin: "storage",
  wasm: "storage",
  node: "storage",
};

const FILENAME_ICONS: Record<string, IconName> = {
  dockerfile: "deployedCode",
  containerfile: "deployedCode",
  compose: "deployedCode",
  makefile: "hardware",
  justfile: "hardware",
  readme: "article",
  license: "license",
  copying: "license",
  notice: "license",
  changelog: "article",
  todo: "article",
  ".gitignore": "forkRight",
  ".gitattributes": "forkRight",
  ".gitmodules": "forkRight",
  ".editorconfig": "settingsApplications",
  ".env": "settingsApplications",
  ".npmrc": "settingsApplications",
  ".nvmrc": "settingsApplications",
};

export function iconForFile(path: string): IconName {
  const name = path.slice(path.lastIndexOf("/") + 1).toLowerCase();
  const byName = FILENAME_ICONS[name];
  if (byName !== undefined) return byName;
  const dot = name.lastIndexOf(".");
  if (dot < 0) return "draft";
  return EXTENSION_ICONS[name.slice(dot + 1)] ?? "draft";
}

const fileProviders = new Map<string, FileCompletionProvider>();

function fileProvider(cwd: string): FileCompletionProvider {
  const cached = fileProviders.get(cwd);
  if (cached !== undefined) return cached;
  const provider = new FileCompletionProvider(cwd);
  fileProviders.set(cwd, provider);
  return provider;
}

export function fileRows(
  cwd: string,
  filter: string,
  limit = FILE_ROWS_CAP,
): ComposerPanelRow[] {
  return fileProvider(cwd)
    .suggest(filter)
    .slice(0, limit)
    .map((item) => ({
      kind: "option" as const,
      key: item.value,
      label: item.value,
      icon: iconForFile(item.value),
    }));
}
