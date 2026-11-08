# openui — programs the log paints

mu answers with a screen when a screen is the answer. This plugin owns the
OpenUI Lang library mu can draw, the store that holds the programs in the log,
and the eleven agent tools that write and read them.

The language itself is not invented here: the parser, the evaluator, the action
plan and the prompt generator are `@openuidev/lang-core`. What mu owns is the
**component library** (what a program may name), the **renderer** (how a program
is drawn with `adwaita-gpuix`, with no DOM), and the **store** (what a program
*is* in a conversation).

## A program, not a tool call

A tool call is the shortest-lived thing in this plugin. The unit is the program:

- a program has a **name** the model keeps stable and re-sends to edit in place;
- the store holds it (`lib/programStore/store.ts`): source, parse, the
  `$variable` values as the human left them, the interactions waiting on the
  agent, and what the last paint published back (components drawn, query
  failures, render errors);
- the **anchor** is the tool call whose row paints it. A render or a stream that
  *creates* a program takes the anchor; a later call that edits it keeps the
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

## The library

`components/library/` is the language's vocabulary, one file per area —
`screen.tsx`, `layout.tsx`, `text.tsx`, `data.tsx`, `figures.tsx`, `lists.tsx`,
`inputs.tsx`. A definition file carries both halves of a component: the
`defineComponent({ name, props, description, component })` the parser and the
prompt read, and the drawer that paints it. `registry.ts` is the list;
`lib/schema/library.ts` turns it into the JSON Schema the parser is built from,
the spec the prompt is built from, and the index `openui-library` prints. **A
component that is not in `registry.ts` does not exist**: the parser drops it as
`unknown-component`.

Seven groups teach it, and a group's notes are part of the prompt: **Screen**,
**Layout**, **Text**, **Data** (Table, Stat, Bar, Chart), **Figures** (Tree,
Timeline, Trace, Heatmap, Breakdown), **Status** (Sections, Todos, Steps) and
**Inputs**. The last three areas are the ones that draw a *shape* rather than
cells: the files a change moved, the spans of a run, the days of a period, the
parts of a total, the standing of a list of work. Each is an `adwaita-gpuix`
widget — `FileTree` (`variant: "list"`, with the `+N -M` columns aligned across
rows), `Timeline`, `Trace`, `ContributionHeatmap`, `SegmentBar`, `ProgressBar` —
so a program's figure wears the colours, ramps and mono columns the app's own
panels wear, and a status mark is drawn from the one vocabulary in
`lib/theme.ts` (`done`, `running`, `current`, `pending`, `skipped`, `error`).

A row may be written as a list of cells or as an object of named fields, and
`components/library/rows.ts` is the only reader of both: `cellOf(row, names, at)`
plus `statusOf` for the state words a program writes loosely ("complete", "wip",
"cancelled") and `isFigure` for the cells that read as numbers — a figure is set
in mono and stands on the right of its column, which is what makes a column of
them line up on the digits.

Adding one means: pick the area file, give the props in the positional order a
program will write them, write the drawer against `ProgramContext` (which is
how it reads theme, children, bindings and how it reports what the human did),
add it to `programDefinitions`, and say which group teaches it in
`programGroups`. A `$variable` binding is `reactive(z…)` on the prop; the
renderer hands the drawer a `ProgramBinding` and the store keeps the value.

Nothing in the drawers writes a raw size: `lib/tokens.ts` says what a program's
`gap 3` and `Title("…","lg")` count for — `sm`/`md` are sizes of text and
`lg`/`xl` are sizes of figures, with `programFigureRole` for the total a screen
reads out — and `lib/theme.ts` says what its colour words (`muted`, `danger`,
`sunken`), its meters (`programProgressTone`) and its marks
(`programStatusGlyph`, `programToneGlyph`) mean.

A block states the figure it is read by in its title row, not in a caption of its
own: `Pane(title, children, surface, tone, trailing)` puts the count, the elapsed
time or the `+78 -9` on the title's right, and a tone of `warning`/`danger`/`success`
puts the mark before the title, the way a tool header does.

## Data and interactions

A program's `Query("name", args, default)` has no backend but the JSON the agent
served with `openui-tools` (`tools/openuiTools.ts`), and what it answered *is*
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

Every interaction the human makes is queued (`programStore.pushEvent`) and
drained once by `openui-events`. `@Set` and `@Reset` steps are carried out on
the page (`lib/analysis/run.ts` → `runActionSteps`); `@ToAssistant`, `@OpenUrl`
and custom actions are reported and wait. A screen therefore works without
another message, and the agent can still read what was done with it.

## The tools

`openui-prompt`, `openui-library`, `openui-validate`, `openui-render`,
`openui-stream`, `openui-state`, `openui-events`, `openui-tools`, `openui-list`,
`openui-switch`, `openui-clear`. These names are what a guardrail rule and a
story point at, so they are never renamed or aliased. One file per tool, named
after it; the guidance a tool adds to the model's instructions is in
`tools/guidelines.ts`, split across the eleven so the whole set reads as one
agreement.

The row for a call is `components/OpenUIToolRows.tsx`, on top of core's shared
row primitives; `lib/toolView.ts` folds every details shape into one view, and
decides whether this row is the one its program is painted from.

## Bounds

A program is a screen, so it is bounded: `MAX_PROGRAM_CHARS` of source,
`MAX_CHUNK_CHARS` per streamed piece, `MAX_PROGRAMS` in the log at once (the
oldest un-shown program is evicted), `MAX_WAITING_EVENTS` queued interactions,
`MAX_FIXTURE_KEYS`/`MAX_FIXTURE_CHARS` of served data. Every read is bounded, and
says what it left out.
