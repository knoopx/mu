import { spawn } from "node:child_process";
import { resolve } from "node:path";

const ENTRY_PATTERN = /\.(?:tsx|ts|jsx|js|mjs|cjs)$/;

const PROBE_DIR_ENV = "MU_PROBE_DIR";

export interface AppLaunch {
  cmd: string;
  args: string[];
  env: NodeJS.ProcessEnv;
}

export function appLaunch(): AppLaunch {
  const argv = process.argv.slice(1);
  const idx = argv.findIndex(
    (arg) => !arg.startsWith("-") && ENTRY_PATTERN.test(arg),
  );
  const args =
    idx === -1
      ? ["run", "dev"]
      : [
          resolve(process.cwd(), argv[idx] as string),
          ...argv.slice(idx + 1).filter((arg) => !arg.startsWith("-")),
        ];

  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env[PROBE_DIR_ENV];

  return { cmd: process.execPath, args, env };
}

export interface NewWindowResult {
  cmd: string;
  args: string[];
  cwd: string;
}

export function spawnNewWindow(
  onError?: (message: string) => void,
): NewWindowResult {
  const { cmd, args, env } = appLaunch();
  const cwd = process.cwd();
  const child = spawn(cmd, args, { cwd, env, detached: true, stdio: "ignore" });
  child.on("error", (err) =>
    onError?.(err instanceof Error ? err.message : String(err)),
  );
  child.unref();
  return { cmd, args, cwd };
}
