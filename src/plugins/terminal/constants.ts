/**
 * What the terminal plugin shares: the keybinding it is opened by, what the
 * shell is told about the terminal it is talking to, and the numbers of the
 * grid the screen is drawn on.
 *
 * The grid's numbers are the plugin's own because nothing else in the app asks
 * for them: no other surface lays out a fixed cell, so there is no shared token
 * for a cell's width and no rhythm to borrow from the log's rows.
 */

/** The hotkey that opens the panel — and, since Escape belongs to the shell,
 *  the key that closes it again. */
export const TERMINAL_KEY = "composer.terminal";

/** Paste is a chord, not Ctrl+V: in a shell Ctrl+V is readline's *insert the next
 *  character literally*, and a terminal that steals it breaks the thing the reader
 *  was trying to type. */
export const TERMINAL_PASTE_KEY = "composer.terminalPaste";

/** What `$TERM` says. The core parses the full xterm grammar and the app paints
 *  256 colours and truecolour, so the shell is told to use both. */
export const TERM_TYPE = "xterm-256color";

/** The 24-bit ask. A program that sees it emits `38;2;r;g;b` instead of the
 *  nearest of 256, and the core hands those bytes back as `fgRgb`/`bgRgb`. */
export const COLORTERM = "truecolor";

/** Lines of history the screen model keeps above the viewport. A command that
 *  printed a wall of output is read by scrolling, not by running it again. */
export const SCROLLBACK_LINES = 4000;

/** How far a scroll step moves through that history: one screenful, so a long
 *  read is one key per page rather than one per line. */
export const SCROLL_PAGE_STEP = 1;

/** A grid narrower or shorter than this is not a terminal anyone can read, and
 *  a program that is offered one line will draw it badly. */
export const MIN_COLS = 20;
export const MIN_ROWS = 5;

/** The mono size the grid is set at — the app's code measure, the one a diff
 *  and a file preview are read at. */
export const CELL_FONT_SIZE = 12;

/** The cell's leading: a terminal packs lines tighter than a page of prose, and
 *  a cursor block that is taller than its glyph is what makes a line readable. */
export const CELL_LEADING = 1.3;

/** How many bytes one read takes off the pty. Output arrives in bursts — a build
 *  log, a `cat` of a big file — and a large read means fewer parses. */
export const PTY_READ_BYTES = 32768;

/** The shortest gap between two repaints of a running screen, in ms. Output
 *  arrives faster than a frame; the grid is painted at a frame's pace and the
 *  bytes in between are folded into one screen. */
export const REPAINT_GAP_MS = 16;

/** How long a shell is given to leave before it is taken away. */
export const TERM_EXIT_GRACE_MS = 400;
