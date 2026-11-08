/**
 * The pty: the one place in the app that names a C library call.
 *
 * A terminal is only a terminal if the program on the other end believes it is
 * talking to one. `node:child_process` can hand a child two pipes, and every
 * program then decides on its own that there is no tty to colour, no job control
 * to set up and no size to draw to. A pty is allocated instead, straight out of
 * libc: `posix_openpt` opens the master, `grantpt`/`unlockpt` make the slave
 * usable, `ptsname_r` names it, and one `ioctl(TIOCSWINSZ)` says how big the
 * screen is — which is the only way the panel's own size ever reaches the shell.
 *
 * `openpty` is deliberately not used: it is the friendlier call, but bun's FFI
 * segfaults on it, and the five calls above are what it is made of.
 *
 * The child is started under `setsid -c` where that exists, so it becomes a
 * session leader and takes the slave as its controlling terminal. Without that
 * a shell prints "no job control in this shell" and Ctrl+C stops meaning
 * anything, which is most of what a terminal is for.
 */
import { dlopen, FFIType, ptr } from "bun:ffi";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, closeSync, openSync, read, write } from "node:fs";
import { COLORTERM, PTY_READ_BYTES, TERM_EXIT_GRACE_MS, TERM_TYPE } from "../constants";
import { withoutMuLoaderEnv } from "../../core/lib/utils/loaderEnv";

const O_RDWR = 2;
/** The parent must not take the slave as *its* controlling terminal: the app
 *  owns the master, and a GUI process that adopts a tty cannot let go of it. */
const O_NOCTTY = 0o400;
const TIOCSWINSZ = 0x5414;

interface PtyCalls {
  posix_openpt(flags: number): number;
  grantpt(fd: number): number;
  unlockpt(fd: number): number;
  ptsname_r(fd: number, buf: unknown, len: number): number;
  ioctl(fd: number, request: number, arg: unknown): number;
}

let calls: PtyCalls | null | undefined;

/** libc's pty calls, resolved once. Null says this libc does not answer them —
 *  a static or unusual build — and the panel says so instead of pretending. */
function ptyCalls(): PtyCalls | null {
  if (calls !== undefined) return calls;
  const signatures = {
    posix_openpt: { args: [FFIType.i32], returns: FFIType.i32 },
    grantpt: { args: [FFIType.i32], returns: FFIType.i32 },
    unlockpt: { args: [FFIType.i32], returns: FFIType.i32 },
    ptsname_r: {
      args: [FFIType.i32, FFIType.ptr, FFIType.u64],
      returns: FFIType.i32,
    },
    ioctl: { args: [FFIType.i32, FFIType.u64, FFIType.ptr], returns: FFIType.i32 },
  };
  for (const soname of ["libc.so.6", "libc.so", "libSystem.B.dylib"]) {
    try {
      const handle = dlopen(soname, signatures);
      const found = handle.symbols as unknown as PtyCalls;
      if (
        typeof found.posix_openpt === "function" &&
        typeof found.ptsname_r === "function" &&
        typeof found.ioctl === "function"
      ) {
        calls = found;
        return calls;
      }
    } catch {
      // This libc is not here; the next name might be.
    }
  }
  calls = null;
  return calls;
}

/** The first program on PATH that answers, or a plain lookup off the usual
 *  places. NixOS keeps bash out of `/bin` entirely, so PATH is asked too. */
function onPath(name: string): string | undefined {
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (dir === "") continue;
    const candidate = `${dir}/${name}`;
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

const SHELL_CANDIDATES = ["bash", "zsh", "fish", "sh"];

export interface ShellCommand {
  argv: string[];
  /** What the status line calls the shell. */
  label: string;
}

/** The shell to run: `$SHELL` when it is real, the first interactive shell on
 *  PATH otherwise. A PTY is only worth opening for something to sit in it. */
function shellCommand(env: NodeJS.ProcessEnv = process.env): ShellCommand | undefined {
  const configured = env.SHELL;
  if (configured !== undefined && configured !== "" && existsSync(configured))
    return { argv: [configured, "-i"], label: configured.split("/").pop() ?? configured };
  for (const name of SHELL_CANDIDATES) {
    const found = onPath(name) ?? ["/bin", "/usr/bin"].map((d) => `${d}/${name}`).find(existsSync);
    if (found !== undefined)
      return { argv: [found, name === "fish" ? [] : "-i"].flat(), label: name };
  }
  return undefined;
}

let setsid: string | null | undefined;

/** `setsid -c`, when util-linux is around to give the child a controlling
 *  terminal. Undefined means not asked yet; null means not installed. */
function controllingTerminal(): string | null {
  if (setsid !== undefined) return setsid;
  const probe = spawnSync("sh", ["-c", "command -v setsid"], { encoding: "utf8" });
  const found = probe.status === 0 ? (probe.stdout ?? "").trim() : "";
  setsid = found !== "" && existsSync(found) ? found : null;
  return setsid;
}

export interface PtyHandles {
  /** Raw bytes as the program wrote them. They are not split on line ends, and
   *  a UTF-8 sequence may straddle two reads — the screen model takes bytes. */
  onData(bytes: Uint8Array): void;
  /** Said when the program on the far end is gone. Optional: a caller that does
   *  not care still gets its reads ending, not a crash. */
  onExit?(note?: string): void;
}

export interface PtyOptions extends PtyHandles {
  cwd: string;
  cols: number;
  rows: number;
  env?: NodeJS.ProcessEnv;
}

export interface Pty {
  readonly shell: string;
  readonly alive: boolean;
  write(text: string): void;
  resize(cols: number, rows: number): void;
  dispose(): void;
}

export type PtyOutcome = { pty: Pty; failure?: undefined } | { pty?: undefined; failure: string };

/** Open a pty and put a shell in it. Every failure answers as a reason: the
 *  panel says what it could not do rather than drawing an empty screen. */
export function openPty(options: PtyOptions): PtyOutcome {
  const libc = ptyCalls();
  if (libc === null)
    return { failure: "this system's C library has no pty calls" };

  const shell = shellCommand();
  if (shell === undefined) return { failure: "no shell was found to run" };

  const master = libc.posix_openpt(O_RDWR);
  if (master < 0) return { failure: "the pty could not be opened" };
  if (libc.grantpt(master) !== 0 || libc.unlockpt(master) !== 0) {
    closeSync(master);
    return { failure: "the pty could not be handed over" };
  }

  const nameBuf = Buffer.alloc(256);
  if (libc.ptsname_r(master, ptr(nameBuf), nameBuf.length) !== 0) {
    closeSync(master);
    return { failure: "the pty has no name" };
  }
  const slavePath = nameBuf.toString("utf8").split("\0")[0];

  const size = Buffer.alloc(8);
  size.writeUInt16LE(options.rows, 0);
  size.writeUInt16LE(options.cols, 2);
  libc.ioctl(master, TIOCSWINSZ, ptr(size));

  let slave: number;
  try {
    slave = openSync(slavePath, O_RDWR | O_NOCTTY);
  } catch {
    closeSync(master);
    return { failure: `the pty ${slavePath} could not be opened` };
  }

  const ctty = controllingTerminal();
  const argv = ctty === null ? shell.argv : [ctty, "-c", ...shell.argv];

  let stopped = false;
  let ended = false;
  const end = (note?: string): void => {
    if (ended || stopped) return;
    ended = true;
    options.onExit?.(note);
  };

  const child = spawn(argv[0], argv.slice(1), {
    cwd: options.cwd,
    stdio: [slave, slave, slave],
    // What the program is told it is talking to. Without `TERM` a shell draws no
    // prompt colour and a full-screen program refuses to start; without
    // `COLORTERM` it reaches for 256 colours when the panel can paint any of 16
    // million. The shell builds projects, so it is told nothing about where mu
    // keeps its own bindings — a napi loader in there would load mu's library
    // and call it its own.
    env: withoutMuLoaderEnv({ ...process.env, TERM: TERM_TYPE, COLORTERM, ...options.env }),
  });
  child.on("error", (error) => end(error.message));
  child.on("exit", (code, signal) => {
    if (signal !== null) return end(`killed by ${signal}`);
    end(code === 0 ? undefined : `exited with code ${code}`);
  });

  // The child holds its own copy in 0, 1 and 2. The parent keeping the slave
  // open would keep the pty alive after the child is gone, so the read below
  // would never see the end.
  closeSync(slave);

  const pump = (): void => {
    if (stopped) return;
    const buf = Buffer.alloc(PTY_READ_BYTES);
    read(master, buf, 0, buf.length, null, (error, taken) => {
      if (stopped) return;
      // A pty master answers EIO once the far end is gone; that is the end of
      // the program, not an error to report.
      if (error !== null) return end();
      if (taken === 0) return end();
      options.onData(buf.subarray(0, taken));
      pump();
    });
  };
  pump();

  return {
    pty: {
      shell: shell.label,
      get alive(): boolean {
        return !ended;
      },
      write(text: string): void {
        if (stopped || text === "") return;
        write(master, text, (error) => {
          if (error !== null && error !== undefined) end();
        });
      },
      resize(cols: number, rows: number): void {
        if (stopped) return;
        const next = Buffer.alloc(8);
        next.writeUInt16LE(rows, 0);
        next.writeUInt16LE(cols, 2);
        libc.ioctl(master, TIOCSWINSZ, ptr(next));
      },
      dispose(): void {
        if (stopped) return;
        stopped = true;
        if (!child.killed) child.kill("SIGTERM");
        // The grace is what a shell that only needs a nudge gets; the hard kill
        // is what one that ignores it gets.
        setTimeout(() => {
          if (!ended) child.kill("SIGKILL");
        }, TERM_EXIT_GRACE_MS);
        try {
          closeSync(master);
        } catch {
          // Already closed by the platform when the last holder let go.
        }
      },
    },
  };
}
