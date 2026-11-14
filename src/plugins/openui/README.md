# openui — programs the log paints

mu answers with a screen when a screen is the answer. This plugin owns the
OpenUI Lang library mu can draw, the store that holds the programs in the log,
and the eleven agent tools that write and read them.

The language itself is not invented here: the parser, the evaluator, the action
plan and the prompt generator are `@openuidev/lang-core`. What mu owns is the
**component library** (what a program may name), the **renderer** (how a program
is drawn with `adwaita-gpuix`, with no DOM), and the **store** (what a program
_is_ in a conversation).

## What you get

- A screen in the log: the model writes OpenUI Lang and it draws, in the app's own
  widgets, on the band every other answer stands on.
- A screen inside the reply: a ```ui fence in a message paints it, and it draws while
  the reply arrives — no tool call, no extra turn.
- Questions that answer themselves into your message: a form's fields and a run of
  buttons land in the composer draft as `Label: answer` lines, and reach the agent only
  when you send them. An input outside a form is a what-if the page holds.
- Eleven tools — `openui-prompt`, `-library`, `-validate`, `-render`, `-stream`,
  `-state`, `-events`, `-tools`, `-list`, `-switch`, `-clear` — and a component library
  in seven groups that is the language's whole boundary: a component absent from it does
  not exist.
- Live data: `Query(name, args, default, refresh)` answers from the JSON
  `openui-tools` serves, and the fourth argument keeps a watching screen current without
  another call.

## A program, not a tool call

A tool call is the shortest-lived thing in this plugin. The unit is the program:

- a program has a **name** the model keeps stable and re-sends to edit in place;
- the store holds it (`lib/programStore/store.ts`): source, parse, the
  `$variable` values as the human left them, the interactions waiting on the
  agent, and what the last paint published back (components drawn, query
  failures, render errors);
- the **anchor** is the tool call whose row paints it. A render or a stream that
  _creates_ a program takes the anchor; a later call that edits it keeps the
  anchor, so a screen is painted once in the log and keeps being live;
- one program is **live** (showing): the one `openui-state`, `openui-events` and
  `openui-switch` read by default;
- a program is in memory only. A resumed session keeps its tool rows and loses
  its screens, and the row says `no longer in the log` instead of inventing one.

`lib/programStore/verbs.ts` is the only place that writes a program: hold the
source, parse it against this app's library, put it in the log, answer with what
the parse said. A tool only chooses the words around that — and `lib/answer.ts`
composes the answer those words stand in, so `openui-render` and `openui-stream`
count their columns, print the store's status line and name their diagnostics
the same way.

## A screen inside the reply

A screen can also be part of the answer, with no tool call in sight. The model
writes a `ui` fenced block in its own reply and the message paints it where the
block stands: it costs no extra turn, and it draws while the reply streams.

- `lib/fences/read.ts` cuts a reply into the prose the markdown block draws and
  the screens mu paints, by markdown's own fence rules (up to three spaces of
  indent, a closing run at least as long as the opener, any other info string
  left alone as a code block) and says what became of the delimiter: `streaming`
  while the reply arrives, `closed` when it was shut, `unclosed` when the reply
  ended mid-block. A block keeps its index among its reply's blocks.
- `components/ProgramFence.tsx` draws one block; `lib/fences/store.ts` holds it
  in the _same_ store under `ui#<reply>#<block>` — the same parser, the same
  renderer, the same `$variable` state, and `openui-state` can read it by that
  name. The key is a place rather than an id because mu's transcript rows are
  re-numbered when a session is resumed: a block keeps being the block the human
  already answered. A block is held after the paint, never during it, and a
  rewind that drops a reply drops its block (`pruneFences`), answers included.
- A streaming block has only a prefix. `parseStreaming` parses the whole source
  and, when that yields no tree, parses the auto-closed one (`autoClose` closes
  every open string and bracket where the text stops). The last frame that drew
  anything is kept, so a screen never blanks itself halfway through a token, and
  while a block streams its parse is marked `incomplete`, which is what keeps a
  half-written line from being reported as a broken program.
- A reply with a user message after it has been answered (`lib/fences/supersession.ts`),
  and an answered question stops being a question: its choices fold into the line
  that went out.
- Reply blocks are bounded apart from rendered programs (`MAX_FENCE_PROGRAMS`).
  Losing one costs nothing: its source is still in the message, and the next
  paint of that message holds it again.

## The answer sheet: an answer goes in the human's message

Nothing a screen asks is sent by itself. `lib/answer/store.ts` holds what the
conversation has staged — one answer per question, keyed by the program and the
question's place in its tree (`lib/answer/positions.ts`: `form@…` for a `Form`,
`run@…` for a run of choice buttons) — and `lib/answer/sheet.ts` writes those
answers into the composer draft as one paragraph. `hooks/useAnswerSheet.ts`
reconciles the two, and the person wins: the draft is theirs, so the sheet
_tracks_ the block it wrote instead of insisting on its own text. A change beside
the block moves it, a change inside it makes that text the person's and the sheet
stops writing it, and a change that removed it takes those answers out, because
the draft is the truth about what will be sent. Sending turns each staged answer
into that question's **sent** answer, which is what folds an answered choice.

- A `Button` with no action is a choice, and a run of them beside each other is
  one question, not several; its label is the answer.
- A `Form` is one question asked as a block of fields, with no submit button: the
  first edit stages every field as its own `Label: answer` line (`lib/answer/form.ts`
  — a field with no answer says `—`, and a multi-select says what was picked _and_
  what was not, because "not" is otherwise the agent's guess). A form with a field
  the person types into waits `TYPED_ANSWER_MS` in the typing: rewriting that line
  on every keystroke would be rewriting the draft under their hands.
- An input outside a form is a **what-if**: it changes the page and queues
  nothing. Its position belongs in `openui-state`, which reports the `$variable`
  values as the human left them; only what asks for a reply — a button, an action
  step, a form being filled — reaches `openui-events`.
- A question is named by where it stands, so `lib/analysis/tree.ts` writes that
  path once and the renderer and the reads that follow a painted screen build it
  alike: the same question re-stages its own answer instead of adding a second
  copy to the message.

## The library

`components/library/` is the language's vocabulary, one file per area —
`screen.tsx`, `layout.tsx`, `content.tsx`, `data.tsx`, `figures.tsx`,
`lists.tsx`, `inputs.tsx`, `widgets.tsx`, `manage.tsx`. A definition file carries both halves of a component: the
`defineComponent({ name, props, description, component })` the parser and the
prompt read, and the drawer that paints it. `registry.ts` is the list;
`lib/schema/library.ts` turns it into the JSON Schema the parser is built from,
the spec the prompt is built from, and the index `openui-library` prints. **A
component that is not in `registry.ts` does not exist**: the parser drops it as
`unknown-component`.

Seven groups teach it, and the groups and the names are the reference
implementation's, so a program written against that plugin is a program this one
draws: **Screen** (Screen, Header, StatusLine), **Layout** (Stack, Row, Grid,
Card, Divider, Spacer, Tabs, Details, Carousel), **Content** (Title, Text,
Caption, Badge, Callout, KeyValue, Code, Icon, Image, File, Sources, List,
Entity, Metric), **Data** (Table, Chart, Sparkline, Progress, Gauge, Bar, Tree,
Timeline, CalendarHeatmap, SegmentedBar, Trace, Snippet, Diff, Steps, Sections,
Todos), **Inputs** (Button, Form, Toggle, Choice, Radio, Select, Checklist,
Rating, Slider, Input, TextArea, Stepper, ListEditor, DateInput, OptionCards,
Swatches, EditableTable, FollowUps), **Widgets** (Timer, Quiz, Flashcards,
Walkthrough) and **Manage** (Board, Roadmap, Status, Plan, Decision, Estimate).
A group's `notes` list is empty and stays empty: what a group _is made of_ is the
fact, and a paragraph of style doctrine that no drawer enforces is a claim the
library cannot keep. The areas that draw a _shape_ rather than cells — the files
a change moved, the spans of a run, the days of a period, the parts of a total,
the standing of a list of work — are each an `adwaita-gpuix` widget (`FileTree`
with its `+N -M` columns aligned, `Timeline`, `Trace`, `Heatmap`, `SegmentBar`,
`ProgressBar`, `DiffPanel`), so a program's figure wears the colours, ramps and
mono columns the app's own panels wear, and a status mark comes from the one
vocabulary in `lib/theme.ts` (`done`, `running`, `current`, `pending`, `skipped`,
`error`).

**Retired names still draw, and are never taught.** Matching the reference
renamed six components — `Pane`→`Card`, `Stat`→`Metric`, `Note`→`Callout`,
`Field`→`Input`, `Heatmap`→`CalendarHeatmap`, `Breakdown`→`SegmentedBar` — and a
name cannot hold two argument orders under one spelling. `aliases.ts` keeps each
retired name as one definition over the drawer it always had, with the order it
always had; it is in the library the parser is built from, so a month-old block
still paints, and out of `programGroups`, so the prompt and `openui-library`
never offer it. The same courtesy covers a slot that moved: a word in
`Stepper`'s stride slot is read as its caption, and a `Form` whose first slot
holds a list is read as mu's older title-first order.

**Three components read a file instead of asking the model to retype it.**
`Snippet("src/a.ts", 40, 62)` prints the lines it names, `Image("shot.png")`
draws the picture this folder holds (and opens it full-screen when clicked, the
same viewer the log uses), and `Load(path)` — the one function of the language
that reaches the disk — answers a file's own value, so `Table(["file", "lines"],
Load("out/report.csv"))` costs the model nothing. `lib/data/load.ts` is the read:
through the same `projectFile` gate every file-panel row runs through, so a name
that walks out of the window's folder is refused in a screen exactly as in a
panel; bounded by `MAX_LOAD_BYTES`, and clipped to `MAX_LOAD_TEXT_CHARS` when it
arrives as text; parsed by kind (JSON, JSONL, CSV, TSV become lists and objects,
anything else stays text); and cached against the file's mtime, so a program
repainted on every slider move does not touch the disk again. A read that found
nothing cannot report from inside a function of this engine, so
`lib/data/source.ts` records the complaint and the paint drains it into the
program's notes — a missing file says so on the page rather than drawing an empty
block. `Sources([...])` is the other half of the same honesty: the page names
where its figures came from.

`Chart` draws through another plugin's `figures/lib/plot.ts` rather than a
coercion of its own: the same reader that takes `chart-render`'s points reads a
program's points, and the plot's geometry and its series ramp live there too, so
a program's plot and a tool's plot cannot become two pictures. What a program
keeps that a plot call cannot is state — the filter that changes which points are
sent — and that is the line between the two: a plot that is the whole answer is a
call, a figure the human operates is a program.

A row may be written as a list of cells or as an object of named fields, and
`components/library/rows.ts` is the only reader of both: `cellOf(row, names, at)`
plus `statusOf` for the state words a program writes loosely ("complete", "wip",
"cancelled") and `isFigure` for the cells that read as numbers — a figure is set
in mono and stands on the right of its column, which is what makes a column of
them line up on the digits.

Adding one means: pick the area file, give the props in the positional order a
program will write them, write the drawer against `ProgramContext` (which is how
it reads theme, children, bindings, where the component stands, and how it
stages an answer), add it to `programDefinitions`, and say which group teaches it
in `programGroups`. A `$variable` binding is `reactive(z…)` on the prop — the one
mark that lets a `$name` stand in that slot — and the renderer hands the drawer a
`ProgramBinding` while the store keeps the value. A bound value is read as the
shape the component declares (`components/library/coerce.ts`): a `$seats` the
program wrote as `"12"`, or a query that answered with a string, is still a
slider's number, and a value that cannot convert is the component's fallback —
what it says when the program gave it nothing.

Nothing in the drawers writes a raw size: `lib/tokens.ts` says what a program's
`gap 3` and `Title("…","lg")` count for — `sm`/`md` are sizes of text and
`lg`/`xl` are sizes of figures, with `programFigureRole` for the total a screen
reads out — and `lib/theme.ts` says what its colour words (`muted`, `danger`,
`sunken`), its meters (`programProgressTone`) and its marks
(`programStatusGlyph`, `programToneGlyph`) mean.

A block states the figure it is read by in its title row, not in a caption of its
own: `Card(title, children, trailing, tone)` puts the count, the elapsed time or
the `+78 -9` on the title's right, and a tone of `warning`/`danger`/`success`
puts the mark before the title, the way a tool header does.

## Data and interactions

A program's `Query("name", args, default)` has no backend but the JSON the agent
served with `openui-tools` (`tools/openuiTools.ts`), and what it answered _is_
the value of its `$name` while painting: `evaluateProgram` reads the query
snapshot over the declared values, which is what puts a query-backed `Table` on
the screen instead of an empty one. A name that was never served fails as a
missing tool and the failure is published to the program, so `openui-state`
reports it rather than showing an empty table. Serving new data invalidates the
cached answers of every program (`lib/analysis/run.ts` holds one query manager
per program, outside React, so a late answer repaints the screen): the manager
counts its answers, the paint's key counts them with it, and `programStore.touch()`
notifies on the next microtask — a query answers when it likes, including in the
middle of the paint that asked for it, and React refuses a re-render asked for
during a render. A repaint asks the manager again only when the program asks for
something new, so a query that failed is not retried every frame it is drawn.

A program's data can move on its own. `Query(name, args, default, refresh)` takes
the seconds between asks as its fourth argument and the query manager keeps
asking, so a screen that watches a build stays current without another call; a
`Mutation(…)` is a write-back, and `@Run($save)` runs it (`lib/analysis/run.ts` →
`runActionSteps` → `fireMutation`) and then asks the program's queries again,
because a write usually changes what a read would answer.

What reaches the agent is what asks for something. `@Set`, `@Reset` and `@Run`
steps are carried out on the page (`runActionSteps`), a button and a form's
answer go into the draft, and only a button press, an action step and a form
being filled are queued for `openui-events` (`programStore.pushEvent`) — a slider
the human dragged is a what-if the page holds, not a message, and a queue of
handle positions is not evidence. `openui-state` reports the values as they were
left. A screen therefore works without another message, and the agent can still
read what was done with it.

## The tools

`openui-prompt`, `openui-library`, `openui-validate`, `openui-render`,
`openui-stream`, `openui-state`, `openui-events`, `openui-tools`, `openui-list`,
`openui-switch`, `openui-clear`. These names are what a guardrail rule and a
story point at, so they are never renamed or aliased. One file per tool, named
after it; the guidance a tool adds to the model's instructions is in
`tools/guidelines.ts`, split across the eleven so the whole set reads as one
agreement — and that agreement opens with the inline block, because a tool's
guidance is the only place mu can teach a contract the model has to honour before
it calls anything: answer with a `ui` block when a screen is the answer, only the
message that ends a turn carries one, anything better used than read is a block
rather than a markdown table, and a question is one `Form` or one run of buttons
whose answer the human sends.

The row for a call is `components/OpenUIToolRows.tsx`, on top of core's shared
row primitives; `lib/toolView.ts` folds every details shape into one view, and
decides whether this row is the one its program is painted from.

## Bounds

A program is a screen, so it is bounded: `MAX_PROGRAM_CHARS` of source,
`MAX_CHUNK_CHARS` per streamed piece, `MAX_PROGRAMS` in the log at once (the
oldest un-shown program is evicted), `MAX_FENCE_PROGRAMS` blocks written inline in
replies — a second budget, so a conversation full of screens cannot push the one
program the agent is editing out of the log — `MAX_WAITING_EVENTS` queued
interactions, `MAX_FIXTURE_KEYS`/`MAX_FIXTURE_CHARS` of served data. A block that
drew nothing prints its first `MAX_FAILURE_NOTES` complaints, and only once its
parse has settled. Every read is bounded, and says what it left out.
