import { readFileSync } from "node:fs";

import { muConfigDir } from "../../core/lib/utils/paths";
import {
  AUTO_SHAPE,
  CONFIG_FILE_ENV,
  CONFIG_FILE_NAME,
  DEFAULT_MAX_FRAMES,
  MAX_MAX_FRAMES,
  MIN_MAX_FRAMES,
} from "../constants";
import type { SnapcompactConfig } from "../types";

/** mu's switch file: `~/.config/mu/snapcompact.json`, or wherever the env says. */
function snapcompactConfigPath(env: NodeJS.ProcessEnv = process.env): string {
  const override = env[CONFIG_FILE_ENV];
  if (override !== undefined && override.trim() !== "") return override.trim();
  return `${muConfigDir(env)}/${CONFIG_FILE_NAME}`;
}
const clampFrames = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_MAX_FRAMES;
  }
  return Math.min(MAX_MAX_FRAMES, Math.max(MIN_MAX_FRAMES, Math.round(value)));
};

const variantOf = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const variant = value.trim();
  return variant === "" || variant === AUTO_SHAPE ? null : variant;
};

/**
 * Read the switch. A missing file, an unreadable one or a field of the wrong
 * shape all answer with the defaults: mu's compaction works without the file,
 * and one bad value never costs the session its archive.
 */
export function readSnapcompactConfig(
  env: NodeJS.ProcessEnv = process.env,
): SnapcompactConfig {
  try {
    const parsed = JSON.parse(
      readFileSync(snapcompactConfigPath(env), "utf8"),
    ) as Record<string, unknown>;
    return {
      enabled:
        parsed["enabled"] === undefined ? true : parsed["enabled"] === true,
      maxFrames: clampFrames(parsed["maxFrames"]),
      shapeVariant: variantOf(parsed["shape"]),
    };
  } catch {
    return {
      enabled: true,
      maxFrames: DEFAULT_MAX_FRAMES,
      shapeVariant: null,
    };
  }
}
