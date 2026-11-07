/**
 * Assets `bun build --compile` embeds.
 *
 * `import asset from "./x.wasm" with { type: "file" }` yields the path bun
 * resolved the asset to — inside the executable's own filesystem once it is
 * compiled. The value is a path string, so `readFileSync` reads it in both dev
 * and the compiled binary.
 */
declare module "*.wasm" {
  const path: string;
  export default path;
}
