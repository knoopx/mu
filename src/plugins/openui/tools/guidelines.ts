/**
 * What each OpenUI tool tells the model about how it is used.
 *
 * The guidance is split across the eleven tools rather than repeated by each:
 * a tool states what only it can state — the authoring contract, the data
 * contract, the reading contract — and the whole set reads as one agreement
 * about the plugin.
 */

export const PROMPT_GUIDELINES: readonly string[] = [
  "Call openui-prompt once before authoring an OpenUI Lang program, then follow it — the component list it prints is the whole truth about what will draw.",
  "A program is a GNOME screen, not a web page: a header bar, one operated list, an inert status line — no card grids, no KPI strip with nothing to operate.",
  "A component absent from the library cannot be drawn, however obvious its name looks.",
];

export const LIBRARY_GUIDELINES: readonly string[] = [
  "Ask openui-library for the index once, then for the specific components a program uses before writing them.",
  "Never guess a component name or its argument order: a wrong one is a hard parse error, and openui-library({ name }) answers the exact schema.",
  "Read a rejected call's component again with openui-library({ name }): the row that says which prop is missing is the fix.",
];

export const VALIDATE_GUIDELINES: readonly string[] = [
  "Validate before rendering when a program is new or was rewritten from a rejected one; the parse is the same one a render will run.",
  "Treat `unresolved` as a bug, not a note: an unresolved name renders as null, and a $ prefix is how a reference is written.",
  "A hard parse error still renders: fix the first error the call printed and re-send the same name rather than starting a second program.",
];

export const RENDER_GUIDELINES: readonly string[] = [
  "Render with openui-render, then read openui-state: the parse said the source is valid, the renderer says what it actually drew.",
  "Keep one name per screen and re-send it to edit in place — a new name every turn leaves a trail of programs the human has to ignore.",
  "A program with unread events is waiting on you: drain openui-events before rendering over it.",
];

export const STREAM_GUIDELINES: readonly string[] = [
  "Stream a long program with openui-stream so the human watches it appear, and close it with done: true — an open program keeps its form interactions disabled.",
  "Send source in the order you generate it; a truncated program mid-stream is expected and is reported as `incomplete`.",
  "Do not re-send a chunk that was already accepted: the source accumulates, it does not replace.",
];

export const STATE_GUIDELINES: readonly string[] = [
  "Read openui-state after a render: the components it lists are what the human sees, and its errors are the ones only drawing revealed.",
  "The `$variable` values are the human's current selections — build the next version of the program from them rather than from what you first set.",
  "name defaults to the program the log paints; name another one to read it without switching to it.",
];

export const EVENTS_GUIDELINES: readonly string[] = [
  "Drain openui-events after a program lands instead of asking the human to describe what they pressed.",
  "`clear: false` is for re-reading the same events; leave it off only when a turn may need them twice.",
  "A program with no events is a screen nobody used yet — change it rather than assuming it worked.",
];

export const FIXTURES_GUIDELINES: readonly string[] = [
  "Set openui-tools before the render that uses the data, keyed by the exact names the program passes to Query().",
  "A Query() whose name was never served fails as a missing tool — the screen shows the failure, so name the fixtures and the queries together.",
  "An empty fixtures object clears them; a program that then re-draws answers with its own defaults.",
];

export const LIST_GUIDELINES: readonly string[] = [
  "Call openui-list before naming a program you did not render in this turn — one screen keeps one name.",
  "A program with unread events is waiting on you: drain its events before you clear it.",
  "The list is cheap: read it instead of guessing a name from an earlier turn.",
];

export const SWITCH_GUIDELINES: readonly string[] = [
  "Switch to a program before reading its state or events when several are in the log, so the read is unambiguous.",
  "Switching shows a program; only openui-render or openui-stream changes what it says.",
  "An unknown name fails with the program list rather than guessing.",
];

export const CLEAR_GUIDELINES: readonly string[] = [
  "Clear a program before replacing a screen with a differently named one, so the log holds only the screens the human still needs.",
  "Clearing is not undoing: the conversation keeps every render that happened, and a re-render of the same name is the way to fix a program.",
  "Its source, its bound state and its queued interactions go with it.",
];
