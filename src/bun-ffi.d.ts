/**
 * `bun:ffi`, declared for the one file that reads it.
 *
 * Bun ships no TypeScript declarations for its own FFI module, and the terminal
 * needs it: a PTY is `posix_openpt`, `grantpt`, `unlockpt`, `ptsname_r` and one
 * `ioctl`, and none of those are reachable from `node:fs`. The declaration is
 * kept to the shape the pty layer actually calls — a symbol table of functions
 * and the pointer/integer types a call carries — rather than a full port of the
 * module's surface.
 */
declare module "bun:ffi" {
  export const FFIType: {
    readonly void: number;
    readonly u8: number;
    readonly i8: number;
    readonly u16: number;
    readonly i16: number;
    readonly u32: number;
    readonly i32: number;
    readonly u64: number;
    readonly i64: number;
    readonly f32: number;
    readonly f64: number;
    readonly ptr: number;
  };

  export interface FFISignature {
    args: readonly number[];
    returns: number;
    /** A C string return is read as a JS string rather than a pointer. */
    returnsString?: boolean;
  }

  export interface FFIResult {
    ptr: number;
    offset?: number;
  }

  export type FFISymbolTable<T> = { [K in keyof T]: (...args: never[]) => unknown };

  export interface DLOpenHandle<T extends Record<string, FFISignature>> {
    handle: number;
    path: string;
    symbols: { [K in keyof T]: (...args: unknown[]) => unknown };
  }

  export function dlopen<T extends Record<string, FFISignature>>(
    path: string,
    symbols: T,
  ): DLOpenHandle<T>;

  /** A JS Buffer (or a pointer and offset) handed to a `ptr` argument. */
  export function ptr(value: BufferSource | FFIResult | number): FFIResult;
}
