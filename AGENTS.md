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
├── interaction/     lib/ components/ hooks/ tools/askUser.ts types.ts constants.ts
├── vcs/             lib/ components/ hooks/ types.ts constants.ts
└── web-search/      lib/duckduckgo/ components/ tools/webSearch.ts types.ts constants.ts
```

A namespace is a folder inside a kind: the agent bridge is `core/lib/agent`, the composer's layout and mode logic is `core/lib/composer`, the DuckDuckGo engine is `web-search/lib/duckduckgo`. A tool is one file per tool, named after the tool: `interaction/tools/askUser.ts`, `web-search/tools/webSearch.ts`. A plugin that registers no agent tool has no `tools/` — `vcs` is a panel and a data layer, not a tool.

### Imports: no barrels

Nothing under `src/plugins/` re-exports a folder, and there is no `index.ts` in any plugin or namespace. Every import names the file it comes from: `../../core/lib/ui/theme`, `../../lib/composer/panelHeight`, `../../../interaction/tools/askUser`. Crossing into another plugin means naming that plugin's file — `core/lib/agent/agentService.ts` registers the ask tool by importing `../../../interaction/tools/askUser`, and `core/lib/project/projectSummary.ts` reads jj through `../../../vcs/lib/repo`.

Adding a file means adding its path at each consumer; there is no public surface to keep in sync, and moving a file updates only its own consumers.

### Naming

- a component file is PascalCase and matches the component it exports (`vcs/components/ChangesPanel.tsx` exports `ChangesPanel`)
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

| README feature | Scene |
| --- | --- |
| Chat | `Chat/session` |
| Agent actions | `AgentActions/work` |
| Questions | `Questions/asked` |
| Composer | `Composer/drafting` |
| Models | `Models/model`, `Models/thinking` |
| Sessions | `Sessions/list` |
| History | `History/tree` |
| Changes | `Changes/panel` |
| Web search | `WebSearch/results` |
| Project header | `ProjectHeader/opens` |
| Looks | `Looks/light`, `Looks/dark`, `Looks/nightsky`, `Looks/accents` |
| (design sweep, not in the README) | the rest of `Looks/*` — the composer's panels in every state, at every accent |

Every PNG under `stories/` is shown by the README, and every image the README shows exists — keep that true when adding a story (`grep -c 'stories/' README.md` against `find stories -name '*.png'`). The one gap is the status bar: the README describes it in words and has no picture, because there is no `stories/StatusBar.stories.tsx` — the bar is only ever seen inside `Chat/*` and the other scenes. Adding that story closes the gap.

## Notes

- There is no DOM. Style objects are `StyleDesc` values and layout is flex; `adwaita-gpuix` owns theme tokens, and colour helpers live in `core/lib/ui/theme.ts` so a component never hand-mixes a hex.
- The transcript page inset (`PAGE_INSET` in `core/lib/ui/transcriptLayout.ts`) is one constant imported everywhere; the adwaita tool-header glyph hangs 24px into it, so the inset stays at 56.
- Stories are the visual regression suite: `stories/` holds one scene per feature row of `README.md`, and `.storybook/fixtures` is shared between them. A story that imports a plugin file is a real consumer of it — check `stories/` and `.storybook/` before removing anything.
