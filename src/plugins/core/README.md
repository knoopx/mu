# core — the app itself

core registers no agent tool: pi's five built-ins and pi's codemode are pi's, and
pi names them. What core registers is the rest of the window, through the same
plugin API every other plugin is written against — which is what keeps that API
from growing a plugin-only side door.

## What you get

- The transcript: the two-column log grid, every tool row's band, its marks and its
  figure columns, and the spinner that hangs beside the composer while a turn runs.
- The composer: the draft, its panels, the pick mode, path completion, and the
  chrome (`panelBox`, `panelInset`) every panel in the app stands in.
- Ten panels owned by the window — model, thinking, sessions, files, path, prompt
  history, the conversation tree, theme, accent, and the plugins panel, which lists
  what this build is made of and switches a plugin off.
- The slash commands the window owns (`/model`, `/thinking`, `/compact`, `/new`,
  `/resume`, `/theme`, `/accent`, `/tree`, `/plugins`).
- The codemode rows, because a script answers with what it printed and the calls it
  made, and a script's nested calls are never transcript rows of their own.
- The shared primitives every plugin draws through: `toolText`/`toolBand`/`ToolRowList`,
  `tokens.ts`, `theme.ts`, the tool-result text builders, and the tree-sitter syntax
  read that paints a diff.

## How it works

`lib/` is the logic with no JSX — `agent/`, `composer/`, `plugin/`, `session/`,
`files/`, `theme/`, `ui/`, `syntax/`, `codemode/`, `project/`, `workspace/` — and
`plugin/host.ts` is the API every registration lands in. `plugin/surfaces.ts` is
the only reader of those slots, so no core file names a plugin: core asks five
questions of the host and every answer walks a slot. `plugin/store.ts` holds the
arming the user set (`$XDG_STATE_HOME/mu/plugins.json`), read once before the host
is built, because the host's slots are the app's shape and a shape taken away
mid-session leaves the system prompt, the panels and the keymap remembering three
different apps.

## Bounds

A plugin imports core and its own folder. core is allowed to read a plugin — that
is the app reading what it hosts, not a plugin reaching into the app — and
`bun run check:plugins` counts those reads so the number can only shrink.
