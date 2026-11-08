/**
 * The codemode worker entrypoint, compiled into the shipped binary.
 *
 * Under a `bun build --compile` binary pi does not resolve the codemode worker
 * as a module — it spawns it at the literal string `./src/extensions/codemode/worker.ts`,
 * because that is the entrypoint pi's own release build compiles out of its own
 * source (`resolveCodemodeWorkerSpecifier` in pi's `dist/config.js`). A Bun
 * compiled executable can only start a worker it embedded as an entrypoint, so
 * mu keeps this file, at exactly that path, and `flake.nix` compiles it as a
 * second entrypoint of `bun build --compile`.
 *
 * The path is pi's, not a mu layout choice: moving this file, or dropping the
 * entrypoint from the compile, makes every codemode call answer
 * "Cannot find module './src/extensions/codemode/worker.ts'". It is also why
 * `@earendil-works/pi-codemode` is a direct dependency rather than a transitive one.
 */
import "@earendil-works/pi-codemode/worker";
