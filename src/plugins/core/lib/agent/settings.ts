import { SettingsManager } from "@earendil-works/pi-coding-agent";

/**
 * mu sends images to the model whole, with pi's auto-resize switched off.
 *
 * pi resizes every image before it is sent, and every resize path in mu's
 * shipped binary fails: the resize worker cannot start from an embedded bundle,
 * and the in-process fallback needs photon's `photon_rs_bg.wasm`, which the
 * binary's own resolver cannot find next to the executable. `resizeImage`
 * returns null, so `processImage` reports
 * "[Image omitted: could not be resized below the inline image size limit]" for
 * every image, at every size — the read tool can never show a picture.
 * (The same wasm rule that keeps guardrails' grammars embedded: see AGENTS.md.)
 *
 * With auto-resize off the pipeline is `normalizeImage` alone, which passes
 * PNG, JPEG, GIF and WebP through as they are, with no wasm in sight.
 *
 * The override is in memory (`applyOverrides` merges and never writes), so mu
 * does not rewrite the user's settings file: the pi CLI, where photon does
 * load, keeps downscaling large images.
 */
export function agentSettingsManager(
  cwd: string,
  agentDir: string,
): SettingsManager {
  const settings = SettingsManager.create(cwd, agentDir);
  settings.applyOverrides({
    images: { ...settings.getSettings().images, autoResize: false },
  });
  return settings;
}
