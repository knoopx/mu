# openui — screens the agent draws

`openui` lets the agent answer with a **screen instead of prose**. It writes a
program in [OpenUI Lang](https://openui.com) (`root = Stack([ ... ])` plus the
statements it uses), the program is parsed against this app's own component
library, and it is **drawn in the conversation log**, inside the tool row that
rendered it. There is no separate surface for it: no canvas window, no panel,
no tab. A program lives where the rest of the answer lives.

## The tools

| Tool | What it does |
| --- | --- |
| `openui-prompt` | the language reference for **this** library: syntax, every component, the action rules |
| `openui-library` | the component index, or one component's props and JSON Schema |
| `openui-validate` | parse a program and answer with its diagnostics, drawing nothing |
| `openui-render` | replace a program with new source and draw it in the log now |
| `openui-stream` | append one chunk; the partial program draws live until `done: true` |
| `openui-state` | a program's source plus what the renderer published: `$state`, components, errors |
| `openui-events` | drain what the human clicked, typed and submitted |
| `openui-tools` | the JSON a program's `Query(name, args, default)` calls resolve to |
| `openui-list` | the programs the log holds, and which one is live |
| `openui-switch` | make an existing program the live one |
| `openui-clear` | remove one program, or all of them |

Write tools (`render`, `stream`, `switch`, `clear`, `tools`) run `sequential`:
a stream's chunks arrive in call order or the program is nonsense.

## One live row per program

`lib/programStore.ts` holds the programs, what the renderer published about
each, and the interactions the human produced. Every program remembers the tool
call that last rendered it (`owner`), and **only that call's row draws the
program**. Every older row for the same name keeps its own diagnostics and says
`painted: by a later call` instead of drawing a second copy of the same screen.
So the log reads forward: the first render, the fixes, and one screen being
operated at the end.

Consequences worth knowing:

- a program's form state belongs to the row that draws it. Scroll the row out
  of the log's virtual list and that state goes with it; scroll back and it
  re-mounts from the program source.
- `openui-state` and `openui-events` read the store, not a row, so they answer
  for a program whose row is off-screen — they just report what was last
  published.
- the store is per process. A new session starts with an empty log's worth of
  programs; `reset()` clears it, and no session switch calls it yet.

## The library is the truth

`components/library/registry.ts` registers every component this app can draw —
83 of them, all bound to `adwaita-gpuix` primitives (`HeaderBar`, `BoxedList`,
`ActionRow`, `Table`, `Chart`, `Svg`, `Math`, `Flashcard`, …). The parser
validates against it, `openui-prompt` is generated from it, `openui-library`
reads its schemas, and `ProgramOutput` draws from it. A component that is not
in that registry cannot be named in a prompt and cannot render, which is why a
guessed name is a hard parse error rather than a blank space.

Programs are GNOME screens, and the group notes in the registry say so to the
agent: a header bar with the view's verbs, one operated list, an inert status
line, flat surfaces, container depth ≤ 1, every repeating row carrying its own
action. `KPI` tiles and card grids are not a screen — the language reference
says so because the library refuses to look like them.

Geometry a program can name (`"m"`, `"xl"`, the tone roles) is defined once in
`lib/tokens.ts`, capped at adwaita-gpuix's `SPACE`, and resolved to theme roles
in `lib/theme.ts`.

## Data comes from the agent

A rendered program has no backends to call. `Query("positions", args, default)`
resolves to the JSON `openui-tools` served under that name; a name nobody
served fails as a missing tool, and the failure is visible in the screen and in
`openui-state`'s query failures rather than hidden behind an empty list.

The loop closes the other way: `@ToAssistant`, button clicks, form submits and
switch changes are pushed into the store, and `openui-events` drains them once,
with the form field values attached.

## Answering twice

Every tool answers the model in aligned columns (`lib/answer.ts` builds the
head, the diagnostic table with the hint that clears each row, and the
not-found sentences) and the log in structured `details`, folded into rows by
`lib/toolView.ts` and drawn by `components/OpenuiToolRows.tsx` with core's
shared row primitives. `lib/analysis.ts` is the single parse: the tools and the
live renderer read their diagnostics from it, so a program is never described
two ways.

## Layout

```
src/plugins/openui/
├── constants.ts          tool names, labels, badge variants, limits
├── types.ts              params, details, the tool row's view shape
├── lib/
│   ├── programStore.ts   the programs, their runtime, their events, their fixtures
│   ├── analysis.ts       one parse, and the hints that clear each error
│   ├── answer.ts         the model-facing head every tool shares
│   ├── params.ts         the parameters the eleven tools share
│   ├── schema.ts         a component's JSON Schema read as prop rows
│   ├── toolView.ts       details → chips, headline, rows
│   ├── format.ts         clocks, bound values, clipped lines
│   ├── tokens.ts         the gap and tone ladder a program names
│   └── theme.ts          what those tones are in the current theme
├── components/
│   ├── library/          the component definitions and registry.ts
│   ├── ProgramOutput.tsx one program, drawn, and its report back to the store
│   └── OpenuiToolRows.tsx the tool row: chips, rows, note, and the live program
├── hooks/usePrograms.ts  the store as React state
└── tools/                one file per tool, named after it
```

## Dependencies and drift

`@openuidev/lang-core` (parse, prompt, validation), `@openuidev/react-lang`
(the renderer and `defineComponent`) and `zod` (the prop schemas).

This plugin was ported from the standalone `openui-canvas` app. Its **intent
cards** (`CalcCard`, `ContactCard`, `TodoCard`, …) were left behind: the
`adwaita-gpuix` mu builds against no longer exports them, and a component that
is not in the registry must not appear in the language reference. The theme
token names were also moved to the current ones (`t.color`, `t.space`,
`t.type`).
