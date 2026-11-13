/**
 * What each OpenUI tool tells the model about how it is used.
 *
 * The guidance is split across the tools rather than repeated by each: a tool
 * states what only it can state, and the whole set reads as one agreement about
 * the plugin. The agreement starts with the one thing the reference plugin is
 * built on — **a screen is part of the reply** — because a tool's guidelines are
 * the only place mu can teach a contract the model has to honour before it calls
 * anything.
 */

/** The contract every tool's guidance stands on: where a screen comes from, and where an answer goes. */
export const REPLY_BLOCK_GUIDELINES: readonly string[] = [
  "Answer with a screen by writing a ```ui block inline in your reply: it is OpenUI Lang, it draws while the reply streams, and it costs no extra model call.",
  "Only the message that ends a turn carries a block — progress notes and tool input stay plain text — and the reply opens with a plain sentence that answers, which is what a preview shows.",
  "Anything better used than read is a block, not a markdown table: a comparison, a plan, a run of options, a figure to move, a diff, a tree of what changed. In doubt, add the block.",
  "A question is one Form, or one run of Buttons with no action: what the human picks or types lands in their own message and is sent by them, never by you and never mid-turn.",
];

export const PROMPT_GUIDELINES: readonly string[] = [
  ...REPLY_BLOCK_GUIDELINES,
  "Call openui-prompt once before authoring an OpenUI Lang program, then follow it — the component list it prints is the whole truth about what will draw.",
  "A component absent from the library cannot be drawn, however obvious its name looks.",
];

export const LIBRARY_GUIDELINES: readonly string[] = [
  "Ask openui-library for the index once, then for the specific components a program uses before writing them.",
  "Never guess a component name or its argument order: a wrong one is a hard parse error, and openui-library({ name }) answers the exact schema.",
  "Read a rejected call's component again with openui-library({ name }): the row that says which prop is missing is the fix.",
];

export const VALIDATE_GUIDELINES: readonly string[] = [
  "Validate a block before you put it in a reply, or a program before you render it; the parse is the same one the log runs.",
  "Treat `unresolved` as a bug, not a note: an unresolved name renders as null, and a $ prefix is how a reference is written.",
  "A hard parse error still renders: the block draws as far as it parses, so fix the first error the call printed rather than starting a second block.",
];

export const RENDER_GUIDELINES: readonly string[] = [
  "A screen that is part of an answer is a ```ui block in the reply, not a call: openui-render is for replacing a program already in the log — one the human is operating, or one your earlier call drew.",
  "Keep one name per screen and re-send it to edit in place — a new name every turn leaves a trail of programs the human has to ignore.",
  "Render with openui-render, then read openui-state: the parse said the source is valid, the renderer says what it actually drew.",
  "A program with unread events is waiting on you: drain openui-events before rendering over it.",
];

export const STREAM_GUIDELINES: readonly string[] = [
  "Use openui-stream to build a program already in the log piece by piece; a ```ui block in your reply already draws while it streams and needs no streaming call.",
  "Send source in the order you generate it; a truncated program mid-stream is expected and is reported as `incomplete`.",
  "Do not re-send a chunk that was already accepted: the source accumulates, it does not replace.",
];

export const STATE_GUIDELINES: readonly string[] = [
  "Read openui-state after a render: the components it lists are what the human sees, and its errors are the ones only drawing revealed.",
  "A block written inline in a reply is a program too, named `ui#<reply>#<block>`; name it to read the screen a message holds.",
  "The `$variable` values are the human's current selections — build the next version of the program from them rather than from what you first set.",
  "name defaults to the program the log paints; name another one to read it without switching to it.",
];

export const EVENTS_GUIDELINES: readonly string[] = [
  "Only what asks for something arrives: a button pressed, an action run, a form answered. An input the human moved is a what-if the page holds — read it with openui-state, and do not expect a queue of slider positions.",
  "Drain openui-events after a program lands instead of asking the human to describe what they pressed.",
  "A program with no events is a screen nobody used yet — change it rather than assuming it worked.",
];

export const FIXTURES_GUIDELINES: readonly string[] = [
  "Set openui-tools before the render that uses the data, keyed by the exact names the program passes to Query().",
  "A Query() whose name was never served fails as a missing tool — the screen shows the failure, so name the fixtures and the queries together.",
  "The fourth argument of Query(name, args, default, refresh) is seconds between asks: give it to a screen that watches something, and it stays current without another call.",
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
