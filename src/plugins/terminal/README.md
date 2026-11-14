# terminal — a real pty in a wide panel

`ctrl+shift+enter` opens a shell in the band over the composer; the same chord closes
it. It registers no agent tool: a shell a person types into is not something the agent
should be able to reach sideways.

## What you get

- A working shell with job control — Ctrl+C means what it says, `stty size` answers with
  the grid the panel actually laid out, and vim gets the cursor-position report it is
  waiting for.
- Scrolling through a program's retained history, a repaint that keeps up with a build,
  and a paste that is wrapped in bracketed-paste escapes only when the program asked.
- A shell that survives closing the panel: a build started there keeps building. One
  shell per window, and it dies with the window.

## How it works

`lib/pty.ts` is the only file in mu that names a C library call — `posix_openpt`,
`grantpt`, `unlockpt`, `ptsname_r` and one `ioctl(TIOCSWINSZ)`, taken out of libc through
`bun:ffi`. `openpty` is deliberately never called: it is the friendlier spelling and the
FFI layer segfaults on it. The child starts under `setsid -c` where util-linux has it, so
it becomes a session leader with the slave as its controlling terminal — without that a
shell says "no job control in this shell" — and the parent's copy of the slave is closed
right after the spawn so the read pump sees the end. `TERM` and `COLORTERM` are set here,
never inherited blindly.

The screen is `@wterm/core`: a terminal parser compiled to a small WASM binary and
addressed as cells. mu has no DOM, so nothing above the core is used and every terminal
on screen is one mu paints — `lib/paint.ts` folds cells into runs, because a cell per
element would put thousands in a window that changes sixty times a second, and the cursor
is the cell under it inverted rather than a mark laid over the grid, which is the only way
it cannot drift a column off its glyph.

**The shell keeps the keys.** A panel's keys reach the app twice, and an Escape taken by
the focused-element route would close the panel on the same keystroke an editor reads as
*leave insert mode*, so that route is shut for this panel entirely and the window route
answers everything `lib/keys.ts` can name. Only the chord that opened the panel gets
away, which is why the hint line says the way out is that chord.

## Bounds

The grid is counted, never measured at paint time: the mono advance is the app's budget,
not a measurement, and a column wider than the pane hides characters the shell believes it
drew. Output is parsed as it lands and the repaint is coalesced to one frame per gap.
