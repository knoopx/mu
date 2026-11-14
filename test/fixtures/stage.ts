import type { ProjectSource } from "../../src/plugins/core/components/ProjectSource";
import { PROJECT_ACTIVE } from "./project";

const PROJECT_PATH = "~/Projects/gpuix-apps/mu";

const FILES: Record<string, string> = {
  "src/plugins/core/components/media.ts": [
    "export function baseType(mimeType: string): string {",
    '  return (mimeType.split(";")[0] ?? mimeType).trim().toLowerCase();',
    "}",
    "",
    "export function mediaKind(mimeType: string): string {",
    "  const base = baseType(mimeType);",
    '  const subtype = base.startsWith("image/")',
    '    ? base.slice("image/".length)',
    "    : base;",
    '  return subtype.replace(/^x-/, "").replace(/\\+xml$/, "");',
    "}",
    "",
    'export const TILE_FIT = "cover";',
    'export const PREVIEW_FIT = "contain";',
  ].join("\n"),
  "README.md": [
    "# mu",
    "",
    "mu is a native GPU-rendered desktop app for the pi coding agent. You type what you want;",
    "the agent reads your project, edits files, runs commands, and shows what it did.",
  ].join("\n"),
};

export const STAGE_SOURCE: ProjectSource = {
  workspace: () => ({ projectPath: PROJECT_PATH, bookmark: "main" }),
  projectSummary: () => Promise.resolve(PROJECT_ACTIVE),
  readFile: (path) => {
    const direct = FILES[path];
    if (direct !== undefined) return direct;
    const match = Object.entries(FILES).find(([name]) => path.endsWith(name));
    return match === undefined ? null : match[1];
  },
};
