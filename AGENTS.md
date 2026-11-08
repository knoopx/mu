# mu — working notes

A GPU-rendered desktop client for the pi coding agent: `@gpuix/react` + `adwaita-gpuix`, no DOM, React 19, TypeScript strict, bun.

## Commands

- `bun run dev` — the app, hot (`bun --hot app.tsx`)
- `bun run typecheck` — `tsc --noEmit`; the tree is expected to stay clean
- `bun storybook .` — renders every scene in `README.md` to `stories/<Feature>/<story>.png`

## Layout

Each plugin is one folder under `src/plugins/`, and every plugin is built the same way inside: `lib/` for logic with no JSX, `components/` for what is drawn, `hooks/` for files whose export is a hook, `tools/` for the agent tools it registers, and `types.ts` and `constants.ts` at its root for what the whole plugin shares.

```
src/plugins/
├── core/            the app itself: registers no tool of its own, and adds screens/ for what fills the window
│   ├── lib/         agent/ commands/ composer/ files/ project/ session/ theme/ ui/ utils/ workspace/
│   ├── components/  transcript rows, composer panels, project card, session tree
│   ├── hooks/       useChatSession, useSessionTree, useThemePanel, useWorkspaceStatus, ...
│   └── screens/     Chat.tsx
├── code-quality/    lib/ (cli/ fallow/ json/ review/ answer/ params/ toolView/) components/ tools/ types.ts constants.ts
├── interaction/     lib/ components/ hooks/ tools/askUser.ts types.ts constants.ts
├── guardrails/      lib/ (treeSitter/ rules/ rulesFile/ engine/ store/ panelRows/ coverage/ report/) components/ hooks/ tools/ README.md types.ts constants.ts
├── vcs/             lib/ components/ hooks/ tools/ types.ts constants.ts
├── web-search/      lib/duckduckgo/ components/ tools/webSearch.ts types.ts constants.ts
└── openui/          lib/ (programStore/ analysis/ answer/ params/ schema/ toolView/ format/ tokens/ theme/) components/ (library/) hooks/ tools/ README.md types.ts constants.ts
```

A namespace is a folder inside a kind: the agent bridge is `core/lib/agent`, the composer's layout and mode logic is `core/lib/composer`, the DuckDuckGo engine is `web-search/lib/duckduckgo`, the OpenUI component library is `openui/components/library`. A tool is one file per tool, named after the tool: `interaction/tools/askUser.ts` is `ask-user`, `web-search/tools/webSearch.ts` is `search-duckduckgo`, `guardrails/tools/guardrailsTest.ts` is `guardrails-test`, `vcs/tools/vcsLog.ts` is `vcs-log` — the file is camelCase, the tool name it registers is kebab. A plugin that registers no agent tool has no `tools/`.

### Imports: no barrels

Nothing under `src/plugins/` re-exports a folder, and there is no `index.ts` in any plugin or namespace. Every import names the file it comes from: `../../core/lib/ui/theme`, `../../lib/composer/panelHeight`, `../../../interaction/tools/askUser`. Crossing into another plugin means naming that plugin's file — `core/lib/agent/agentService.ts` registers the ask tool by importing `../../../interaction/tools/askUser`, and `core/lib/project/projectSummary.ts` reads jj through `../../../vcs/lib/repo`.

Adding a file means adding its path at each consumer; there is no public surface to keep in sync, and moving a file updates only its own consumers.

### Naming

- a component file is PascalCase and matches the component it exports (`vcs/components/ChangesPanel.tsx` exports `ChangesPanel`). The one exception is a namespace of component *definitions* rather than components: `openui/components/library/layout.tsx` holds the `Stack`, `Row` and `Grid` definitions of one area of the language and `registry.ts` registers them — the area is the unit there, not one component
- a hook file is `useThing.ts` and lives in its plugin's `hooks/`, in the plugin that owns the thing (`useProjectSummary` in `core/hooks`, `useChangesPanel` in `vcs/hooks`)
- a namespace keeps its key hints in `shortcuts.ts`, and a plugin keeps what the whole plugin shares in `types.ts` and `constants.ts`
- when two modules in one namespace want the same name, the name is the thing that is wrong: the changes panel's state hook returns `ChangesPanelState` so the `ChangesPanel` component owns the name, and the composer counts rows in a height with `composerPanelRowsForHeight` so the panel's own `composerPanelRows` owns its name

## Stories

One feature, one story, one scene. Each story in `stories/` renders the app — the window, the log, the composer slot, the status bar — at the size the real window is used at, with a session in it doing the thing the feature is. A story is a picture of the app being used, not a component in a box. The PNG it writes is the image `README.md` shows for that feature, so the README stays a description of the app and every claim in it has a scene behind it.

- `bun storybook .` renders every scene to `stories/<Feature>/<story>.png`
- `bun storybook . --only Chat` renders one feature
- the capture keeps the declared window width and fits its height to what is painted, so heights are a starting point, not a promise
- fixtures live in `.storybook/fixtures` and are shared between features: transcript scenes in `scenes.ts`, tool rows in `tools.ts`, project history in `project.ts`, conversation trees in `tree.ts`, pasted images in `images.ts`
- the window-scale helpers live in `.storybook/chrome`: `chat()` puts a session in the window, `askInChat()` puts a question in the composer slot, `overChat()` opens an overlay over the log

A story id is the meta `title` over the exported scene, so `stories/Chat.stories.tsx` with `title: "Chat"` and `export const session` is the `Chat/session` scene, and it writes `stories/Chat/session.png`.

| README feature                    | Scene                                                                         |
| --------------------------------- | ----------------------------------------------------------------------------- |
| Chat                              | `Chat/session`                                                                |
| Agent actions                     | `AgentActions/work`                                                           |
| Questions                         | `Questions/asked`                                                             |
| Composer                          | `Composer/drafting`                                                           |
| Paths                             | `Paths/completing`                                                            |
| Models                            | `Models/model`, `Models/thinking`                                             |
| Sessions                          | `Sessions/list`                                                               |
| History                           | `History/tree`                                                                |
| Changes                           | `Changes/panel`, `Changes/instructed`                                         |
| Web search                        | `WebSearch/results`                                                           |
| Code quality                      | `CodeQuality/surveyed`                                                        |
| Generative UI                     | `GenerativeUI/rendered`                                                       |
| Guardrails                        | `Guardrails/triggered`, `Guardrails/tended`                                   |
| Project header                    | `ProjectHeader/opens`                                                         |
| Looks                             | `Looks/light`, `Looks/dark`, `Looks/nightsky`, `Looks/accents`                |
| (design sweep, not in the README) | the rest of `Looks/*` — the composer's panels in every state, at every accent |

Every PNG under `stories/` is shown by the README, and every image the README shows exists — keep that true when adding a story (`grep -c 'stories/' README.md` against `find stories -name '*.png'`). The one gap is the status bar: the README describes it in words and has no picture, because there is no `stories/StatusBar.stories.tsx` — the bar is only ever seen inside `Chat/*` and the other scenes. Adding that story closes the gap.

## Notes

- Path completion lives in `core/lib/composer/pathCompletion.ts`: the draft's trailing path token (`~`, `~/x`, `/x`, `./x`, `../x`, `@x`, anything with a `/`) is listed as a shell lists it, and the completion panel's query **is** the draft — `isCompletionMode` — so typing keeps editing the draft and Tab takes the highlighted path, a directory keeping the panel open. Tab is `editor.autocomplete`, handled in `composer/keyRouter.ts` with the `cycle` flag so the window listener never takes a completion twice.
- There is no DOM. Style objects are `StyleDesc` values and layout is flex; `adwaita-gpuix` owns theme tokens, and colour helpers live in `core/lib/ui/theme.ts` so a component never hand-mixes a hex.
- No component writes a bare number in a style. `core/lib/ui/tokens.ts` is the one answer to how big, how much space, what leading and what weight, and it defers to adwaita's scale where that scale already owns the value: `ROW_HEIGHT` is the height of every one-line row (the tree, a change feed, a picker), `idColumn(t)`/`monoColumn(t, chars)` measure a column of monospace text, `lineBox(t, role)`/`codeLineBox(t)` are the line boxes of text roles (`leadingOf` for a caller that sets a ratio), `emphasisWeight(t)`/`titleWeight(t)`/`plainWeight(t)` are the only weights, `MARKER_GLYPH`/`INLINE_GLYPH`/`STATE_GLYPH`/`ACTION_GLYPH` are the marks a row draws, `HAIRLINE` is every rule and edge, and `elevatedShadow()` in `theme.ts` is the one drop over the log, from `ELEVATION`. A plugin's own sizes stay named in its own file when nothing else asks for them (`MAX_ROWS`, `PANE_GROW`); what must not happen is two files spelling the same number differently. Secondary text is `mutedText(t)` — a call site never reads `t.color.text.dim`.
- The transcript page inset (`PAGE_INSET` in `core/lib/ui/transcriptLayout.ts`) is one constant imported everywhere; the adwaita tool-header glyph hangs 24px into it, so the inset stays at 56.
- Images reach the model whole. `core/lib/agent/settings.ts` builds the `SettingsManager` mu passes to `createAgentSessionServices` and overrides `images.autoResize` to false in memory (`applyOverrides` never writes the user's file). pi resizes every image before sending it, and no resize path exists inside a `bun build --compile` binary — no worker from an embedded bundle, and no `photon_rs_bg.wasm` for the in-process fallback — so `resizeImage` returns null and pi drops every image with "Image omitted: could not be resized below the inline image size limit", at any size. Auto-resize off, the pipeline is `normalizeImage`, which passes PNG/JPEG/GIF/WebP through with no wasm. The same thing is a settings switch (`Auto-resize images` → false) for one-off debugging.
- Guardrails are driven by three agent tools in `guardrails/tools/`, named after the pi tools they port: `guardrails-test` runs a fixture suite against the live engine, `guardrails-fixture-update` writes the suites, `guardrails-coverage` reads saved session transcripts for observed blocks. There is no manage tool: arming is the panel's — `guardrailsStore` switches, driven by `/guardrails` and the composer keybinding, and the agent never arms, disarms, clears the log or dry-runs. **Guardrails are the user's files, never the project's and never pi's**: rules are `$XDG_CONFIG_HOME/mu/guardrails/<domain>.json`, the suite that proves a domain sits beside it as `<domain>.fixtures.json`, and the arming the app remembers is `$XDG_STATE_HOME/mu/guardrails.json`. `lib/rulesFile.ts` is the one that knows those paths (`rulesDir`/`fixturesDir`/`stateFilePath`, with `MU_GUARDRAILS_RULES` and `MU_GUARDRAILS_FIXTURES` as overrides, `saveGuardrailRule`/`deleteGuardrailRule` as the writers); `startGuardrails()` reads the rule files into the registry at boot and `reloadGuardrails()` reads them again. A domain is the filename, so a rule and its file can never disagree, and one unreadable file loses only its own rules. The format, the validation each record passes, and why a rule needs a `block-*` and an `ok-*` case are in `guardrails/README.md`. mu writes no rules: `lib/rules.ts` is the registry and the validator, and no tool authors a rule.
- A guarded call is a list of **sources**, and a source is one key's text in one grammar: the `command`/`cmd` of a command tool is bash, and the `content`/`newText`/`oldText`/`text` a file tool writes is parsed in the grammar its `path` names, so an `edit` of a `.py` file is checked against python rules and a `write` of a `.json` file is released unread. All sixteen grammars `@vscode/tree-sitter-wasm` ships are registered — bash, cpp, csharp, css, go, ini, java, javascript, php, powershell, python, regex, ruby, rust, tsx, typescript — imported by name in `treeSitter/grammar.ts` so `bun build --compile` embeds them, and booted only for the languages the registry names. A rule that reads file text says so with `tools` and `fields`; a rule naming neither reads command text only, which is what every rule written before file sources did. The format, the source table and the fixture shape are in `guardrails/README.md`.
- Guardrails parse in-process with web-tree-sitter, on the app's JS thread. A rule is a tree-sitter query plus JS regex filters: a `#match?` written on a bare `(program) @root` has its predicate ignored by the query engine, so whole-command tests live in `filters` where they are checked. Grammars come from `@vscode/tree-sitter-wasm` — a `dylink.0` custom section is required, and the prebuilt `tree-sitter-wasms` set is refused by every web-tree-sitter since 0.20. `Parser.init()` must be handed `wasmBinary` bytes read from an embedded `with { type: "file" }` asset, because its own resolver finds no `.wasm` inside a `bun build --compile` binary, and Bun cannot start an embedded worker there, so a parse is budgeted (`PARSE_BUDGET_MS`) and always fail-open.
- vcs is a panel and ten agent tools in `vcs/tools/`: `vcs-log`, `vcs-file-diff`, `vcs-file-history`, `vcs-file-history-show`, `vcs-conflicts`, `vcs-oplog` and `vcs-hunk-list` read, and `vcs-describe`, `vcs-file-split` and `vcs-hunk-split` write. Those ten names are what the user's guardrail rules point an agent at, so they are never renamed or aliased. `lib/ops.ts` is the only file that names the change-tracking CLI: a tool names a revision, files, hunks and a message and never a flag, and answers in one status vocabulary (`ok`, `failed`, `unsupported`, `empty-selected`, `empty`, `none`, `binary`) rather than an exit code, and a write is verified by re-resolving the post-state so a tool reports the ids the repo resolved and never the ones the caller typed. A result is written for two readers by `lib/toolResult.ts`: aligned-column text in `content` for the model and structured `details` for the GUI, folded by `lib/toolView.ts` and painted by `vcs/components/VcsToolRows.tsx`, dispatched from `core/components/ToolExecution.tsx`. The panel's describe (`d`), split (`s`) and split-hunk (`h`) keys send an instruction built in `lib/instructions.ts` — `ChangesPanelOptions.onInstruction` → `composerActions.sendInstruction` → `chat.send` — rather than typing a message or running the write locally, so no describe or split happens without a tool row behind it. The preview pane picks by file, not by patch text: `lib/preview.ts` chooses between adwaita's `DiffPanel` (the `<diff>` widget, or its `DataTable` when a csv/tsv/tab file parses as two tables) and the two pictures of an image file, whose bytes `loadFileBytes` in `lib/repo.ts` reads binary-safe out of `jj file show` at the change and at its first parent — `run()` decodes stdout as text, so a patch cannot carry a picture.
- A tool result is painted by one set of primitives in `core`, because two plugins drawing their own rows is where the copies started. `core/lib/agent/toolText.ts` is how an answer reads (`toolResult`, `blocks`, `tableOf`, `statusTable`, `missing`, `counted`, `firstLineOf`); `core/lib/agent/toolPreview.ts` is the single line a tool header shows, driven by a `ToolPreviewVocabulary` the plugin supplies; `core/lib/ui/toolRowPaint.ts` holds the tone/badge/status vocabulary and the row styles, including `ToolPaintRow`; and `core/components/ToolDataRows.tsx` draws `ToolChips`, `ToolDataRow`, `ToolSummary`, `ToolStateNote`, `ToolSectionHead`, `ToolUnknownResult` and `ToolRunning`. A plugin's `lib/toolView.ts` folds its `details` into `ToolPaintRow`s and its `components/*ToolRows.tsx` only chooses words and badge variants — it never draws a row of its own.
- code-quality registers six tools (`code-complexity`, `code-dead-code`, `code-duplicates`, `code-review`, `code-symbol-inspect`, `code-symbol-references`) and drives two external analysers through `lib/cli.ts`, the only file that names a binary: `fallow` for complexity, unused code, clones, a file's surface and a symbol's call chain, and `inspect` for entity-level change review. **The analyser is not the agent's concern, so nothing the agent reads names it**: no `description`, `promptSnippet`, `promptGuidelines`, parameter description or answer text mentions `fallow`, `inspect` or `bunx`, and an unavailable analyser is reported as "the project analyser is not installed or not on PATH", never as a binary name. The name survives only in `constants.ts`/`lib/cli.ts` and in `details.analyzer`, which is app-side and paints the log chip for the human. A tool names a subcommand, its scope and a limit, never a flag; `lib/fallow.ts` reads the JSON envelope into the details types, `lib/answer.ts` is the head and the nothing-found branch every tool shares, and `lib/params.ts` states `limit` once for all six.
- Stories are the visual regression suite: `stories/` holds one scene per feature row of `README.md`, and `.storybook/fixtures` is shared between them. A story that imports a plugin file is a real consumer of it — check `stories/` and `.storybook/` before removing anything.
