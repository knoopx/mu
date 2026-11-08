/**
 * The loader paths mu was launched with, and the children that must not inherit them.
 *
 * `flake.nix` wraps the compiled binary with two paths that mean something only
 * to mu's own install: `NAPI_RS_NATIVE_LIBRARY_PATH` names the gpuix-native
 * `.node` under `$out/lib`, and `NODE_PATH` names `$out/lib/node_modules`, where
 * the QuickJS wasm pi reads off disk sits. A wrapper cannot give one process an
 * environment of its own, so every process mu starts inherits both — and for any
 * of them that is not mu, that is a bug.
 *
 * `NAPI_RS_NATIVE_LIBRARY_PATH` is the sharp one. Every napi-rs generated loader
 * — gpuix-native's own, and the same generated file in `@tailwindcss/oxide`,
 * tree-sitter, oxc and the rest — reads that variable before it looks anywhere
 * else, `require`s whatever it names, and never checks what came back. A project
 * built inside mu's terminal panel, or by one of the agent's commands, therefore
 * loads gpuix-native as if it were its own binding and gets an object with none
 * of the exports it asked for: tailwind's `Scanner` comes back undefined and the
 * build dies somewhere else entirely, on a minified `T is not a constructor`.
 *
 * `NODE_PATH` is blunter but real: it puts mu's `node_modules` in the search path
 * of a project that already has its own.
 *
 * So mu keeps both as its own answers and hands them to nothing:
 *
 * - The native path is a boot-time answer only. The GPU binding is loaded while
 *   the entry's imports are evaluated, so `retireNativeLibraryEnv()` drops the
 *   variable from `process.env` in the entry body, and every spawn after that —
 *   including pi's own bash tool, which mu does not control — inherits a clean
 *   environment.
 * - `NODE_PATH` cannot go the same way: pi resolves `quickjs-wasi/quickjs.wasm`
 *   through it lazily, at the first codemode call. So mu strips it itself, at
 *   each process it starts that is not another mu window.
 */

/** Where a napi-rs generated loader is told to find its native library. */
export const NATIVE_LIBRARY_ENV = "NAPI_RS_NATIVE_LIBRARY_PATH";
/** Where `require.resolve` looks inside a `bun build --compile` executable. */
export const NODE_PATH_ENV = "NODE_PATH";

/** What mu was launched with, so another mu window can be launched the same way. */
let launched: NodeJS.ProcessEnv = {};

/** Drop mu's native-library path from its own environment. Call once, from the
 *  entry body: by then the GPU binding has loaded and the variable only names
 *  mu's library to the next loader that happens to read it. Idempotent, so a hot
 *  re-run of the entry keeps what it first captured. */
export function retireNativeLibraryEnv(): void {
  const native = process.env[NATIVE_LIBRARY_ENV];
  if (native !== undefined) launched[NATIVE_LIBRARY_ENV] = native;
  const nodePath = process.env[NODE_PATH_ENV];
  if (nodePath !== undefined) launched[NODE_PATH_ENV] = nodePath;
  delete process.env[NATIVE_LIBRARY_ENV];
}

/** A copy of `env` for a process that is not mu: it resolves its own bindings. */
export function withoutMuLoaderEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const copy = { ...env };
  delete copy[NATIVE_LIBRARY_ENV];
  delete copy[NODE_PATH_ENV];
  return copy;
}

/** A copy of `env` for another mu window, which needs the answers its parent was given. */
export const withMuLoaderEnv = (env: NodeJS.ProcessEnv): NodeJS.ProcessEnv => ({
  ...env,
  ...launched,
});
