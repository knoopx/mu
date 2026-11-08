import { SettingsManager } from "@earendil-works/pi-coding-agent";

/**
 * The SettingsManager mu hands pi for a session. mu overrides nothing in it.
 *
 * pi resizes every image before it sends one: the bytes are converted to a
 * supported format, corrected for EXIF orientation and brought under the
 * provider's inline limit, and a note tells the model the coordinate scale.
 * That work runs on Photon's wasm, which photon-node reads **from disk** and
 * which pi's resize worker cannot reach from an embedded bundle, so for a time
 * mu switched `images.autoResize` off to dodge a resize path that could never
 * run inside a `bun build --compile` binary. The dodge was both unnecessary and
 * inert — pi's `SettingsManager.reload()` during resource loading rebuilds the
 * merged settings and drops any `applyOverrides` — and the shipped binary can
 * run the resize path once the package installs `photon_rs_bg.wasm` beside the
 * executable, which `flake.nix` does. So the settings stay pi's own, and the
 * wasm is a packaging obligation, not a settings one.
 */
export function agentSettingsManager(
  cwd: string,
  agentDir: string,
): SettingsManager {
  return SettingsManager.create(cwd, agentDir);
}
