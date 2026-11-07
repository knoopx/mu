import { readdirSync, type Dirent } from "node:fs";
import { join } from "node:path";
import type { IconName } from "adwaita-gpuix";
import { fuzzyFilter } from "./fuzzy";

export interface SlashCommand {
  name: string;
  description: string;

  icon?: IconName;

  args?: string;
}

export interface AutocompleteItem {
  value: string;
  label: string;
  description?: string;

  icon?: IconName;

  args?: string;

  submit?: boolean;
}

export interface AutocompleteProvider {
  suggest(context: string): AutocompleteItem[];
}

export class SlashCommandProvider implements AutocompleteProvider {
  private readonly commands: SlashCommand[];

  constructor(commands: SlashCommand[]) {
    this.commands = commands;
  }

  suggest(context: string): AutocompleteItem[] {
    const query = context.replace(/^\//, "");
    return fuzzyFilter(this.commands, query, (c) => c.name).map((c) => ({
      value: `/${c.name}`,
      label: c.name,
      description: c.description,
      icon: c.icon,
      args: c.args,
      submit: true,
    }));
  }
}

const MAX_WALK_DEPTH = 12;
const MAX_WALK_ENTRIES = 20000;

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".jj",
  ".hg",
  ".svn",
  ".cache",
  ".venv",
  "venv",
  ".fallow",
  ".next",
  ".nuxt",
  ".turbo",
  ".parcel-cache",
  ".gradle",
  ".idea",
  ".terraform",
  "__pycache__",
  "dist",
  "build",
  "target",
  "out",
]);

export class FileCompletionProvider implements AutocompleteProvider {
  private readonly basePath: string;
  private entries: string[] | null = null;

  constructor(basePath: string) {
    this.basePath = basePath;
  }

  private loadEntries(): string[] {
    if (this.entries !== null) return this.entries;
    const files: string[] = [];
    const walk = (dir: string, prefix: string, depth: number): void => {
      if (depth > MAX_WALK_DEPTH || files.length >= MAX_WALK_ENTRIES) return;
      let entries: Dirent[];
      try {
        entries = readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (files.length >= MAX_WALK_ENTRIES) return;
        const path = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
        if (entry.isDirectory()) {
          if (IGNORED_DIRS.has(entry.name)) continue;
          walk(join(dir, entry.name), path, depth + 1);
        } else if (entry.isFile()) {
          files.push(path);
        }
      }
    };
    walk(this.basePath, "", 0);
    this.entries = files.sort((a, b) => a.localeCompare(b));
    return this.entries;
  }

  suggest(context: string): AutocompleteItem[] {
    const prefixMatch = context.match(/^(@|~\/|\.\.\/|\.\/)/);
    const prefix = prefixMatch ? prefixMatch[0] : "";
    const query = context.slice(prefix.length);
    return fuzzyFilter(this.loadEntries(), query, (entry) => entry).map(
      (entry) => ({
        value: prefix + entry,
        label: entry,
      }),
    );
  }
}

class CombinedAutocompleteProvider implements AutocompleteProvider {
  private readonly slash: SlashCommandProvider;
  private readonly files: FileCompletionProvider;

  constructor(commands: SlashCommand[], basePath: string) {
    this.slash = new SlashCommandProvider(commands);
    this.files = new FileCompletionProvider(basePath);
  }

  suggest(context: string): AutocompleteItem[] {
    return context.startsWith("/")
      ? this.slash.suggest(context)
      : this.files.suggest(context);
  }
}
