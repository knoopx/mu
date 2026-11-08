import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const APP_DIR_NAME = "mu";

const fromEnv = (
  env: NodeJS.ProcessEnv,
  key: string,
  fallback: string,
): string => {
  const value = env[key];
  const root =
    value === undefined || value.trim() === "" ? fallback : value.trim();
  return join(root, APP_DIR_NAME);
};

const home = (env: NodeJS.ProcessEnv): string => env["HOME"] ?? homedir();

export const muConfigDir = (env: NodeJS.ProcessEnv = process.env): string =>
  fromEnv(env, "XDG_CONFIG_HOME", join(home(env), ".config"));

export const muStateDir = (env: NodeJS.ProcessEnv = process.env): string =>
  fromEnv(env, "XDG_STATE_HOME", join(home(env), ".local", "state"));

export const muDataDir = (env: NodeJS.ProcessEnv = process.env): string =>
  fromEnv(env, "XDG_DATA_HOME", join(home(env), ".local", "share"));

/** What mu keeps only to avoid doing it again — a day's worth of API answers, not state the user would miss. */
export const muCacheDir = (env: NodeJS.ProcessEnv = process.env): string =>
  fromEnv(env, "XDG_CACHE_HOME", join(home(env), ".cache"));

export const muPathUnder = (base: string, ...parts: string[]): string =>
  join(base, ...parts);

export function muDir(base: string, ...parts: string[]): string {
  const path = join(base, ...parts);
  try {
    mkdirSync(path, { recursive: true });
  } catch {}
  return path;
}

export const displayPath = (
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): string => {
  const root = home(env);
  return path === root || path.startsWith(`${root}/`)
    ? `~${path.slice(root.length)}`
    : path;
};
