# mu

mu is a native GPU-rendered desktop app for the pi coding agent. You type what you want; the agent reads your project, edits files, runs commands, and shows what it did. The name comes from the Greek letter [mu](<https://en.wikipedia.org/wiki/Mu_(letter)>) (Μ, μ), the twelfth letter of the Greek alphabet.

The composer works like Raycast: a keystroke opens a panel above it, you type to filter a list, Enter applies, Esc closes. The whole app is keyboard-driven; shortcuts are printed in the bar under every panel.

![A session in progress](stories/Chat/session.png)

_One window, one conversation: your prompt, what the agent ran, what it read, what it changed, the answer, its reasoning, and what the run cost. The bar at the bottom of the window keeps the project, the model, the turns, the tokens, the time, the speed, and the cost in view while you work._

---

Every screen below is shown as it looks in a real window, with a session in it.

| Feature        | What you see                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| Chat           | a whole session: photos pasted, the photos read, the answer arriving, its reasoning                    |
| Agent actions  | commands running, passing, failing; a read; a photo read; a diff; output that fills the window        |
| Questions      | the agent stops mid-run and asks you, in the composer slot                                            |
| Composer       | a draft typed, two photos attached above it, the command panel open                                   |
| Models         | the model list in the middle of a session, five models, the current one ticked                        |
| Models         | the thinking levels, the current one ticked                                                           |
| Sessions       | the project's saved sessions, every one of them, one previewed                                        |
| History        | the conversation as a tree, the cursor on a side branch                                               |
| Changes        | the project's history, the files of a change, its diff                                                |
| Web search     | a search, the pages it read, a search that got nothing                                                |
| Status bar     | the counts of one answer and of the whole conversation                                                |
| Project header | the moment you open mu on a project                                                                   |
| Looks          | the same session in each theme, and the nine accent colours                                            |

## Chat

Type a message, press Enter. The answer arrives in place, word by word, and stays: the log keeps your prompt, everything the agent did, and what it said.

Answers read as documents — headings, lists, tables, code you can copy, links you can open. The agent's reasoning sits beside its answer, openable when the change is risky and folded away when it is not. A run in progress can be stopped with Esc, and the half-finished answer stays where it stopped.

Pasted screenshots go into the conversation and the agent looks at them; the picture is in the log, so you know what it saw.

![A session in progress](stories/Chat/session.png)

## Agent actions

Every command, file read, and file edit is a line in the log, in the order it happened: running, passed, failed. Failed lines are marked in red and keep their error under them, so the failure sits right where the agent's next move begins.

A read shows the slice of the file it took; an edit shows the diff it made. Long output scrolls where it is and never pushes your conversation off screen. You can always see what the agent knew, and what it changed, before you trust it.

![The agent at work](stories/AgentActions/work.png)

## Questions

When the job has a fork in it, the agent stops and asks, in the place you type: the question, why it is asking, the options numbered, and what the highlighted one means. Some questions take several answers, some take your own words, some are a yes or no before the irreversible step.

Nothing runs while it waits on you, and the bar at the bottom of the window says which question of how many you are on while it does. What it asked and what you chose stay in the log, so the reason behind the work is readable later.

![It stops and asks](stories/Questions/asked.png)

## Composer

The composer is how you talk to the agent and how you drive the app. The card grows with the draft, keeps the attachments you pasted above it, and carries the active model, the thinking level, and how full the conversation is as pills.

A keystroke opens a panel above it: every command (`Ctrl+Shift+P`), the files of the project (`Ctrl+P`), your own past prompts (`Ctrl+R`), the model (`Ctrl+L`), the thinking level (`Ctrl+T`), the sessions (`Ctrl+H`), the conversation tree (`Ctrl+Shift+T`), the project's changes (`Ctrl+K`). You type to narrow the list, Enter applies, Esc closes, and the keys that do it are printed under the panel.

How full the conversation is shows on the composer's own border: it runs along the edge, turns orange, then red.

![A draft, attachments, and the command panel open](stories/Composer/drafting.png)

## Models

You pick the model from a searchable list and set the thinking level, in the middle of a session, and the change applies the moment you choose. Long lists narrow as you type and page by the cursor, with the match count under the panel.

![Choosing a model](stories/Models/model.png)

![The thinking levels, the current one ticked](stories/Models/thinking.png)

## Sessions

Sessions are saved per project. Open the list to see each one with its label, its age, and its first message; arrow over it to read the conversation before you open it; type to narrow it, with the match count in the bar under the panel; delete one, and undo it from the bar that says so.

![The sessions of this project](stories/Sessions/list.png)

## History

A conversation is a tree, not a line. Open the history to see every point you have been at — your prompts, the agent's calls, labels, compactions, and the branches off them. Jump to a point and the conversation rewinds to it; the branch you left stays in the tree. Filter it by what was said.

![The conversation as a tree](stories/History/tree.png)

## Changes

The agent's work is your project's history. The changes panel shows the history on the left, the files of the selected change on the right, and the diff in between. From the same place you name a change, group several, split, squash, revert, drop, move, bookmark, and push.

![Your project's history](stories/Changes/panel.png)

## Web search

When the agent needs something your project does not know, it searches the web, and you watch it search. The pages it found are in the log with the answer they produced, so you can check its sources; a search that got nothing is shown as got nothing.

![It went and looked](stories/WebSearch/results.png)

## Status bar

The bar at the bottom of the window keeps the project, the bookmark, the model, and the thinking level in view, and under the last answer of each turn sit that answer's tokens, seconds, and speed. The line closing the log totals the whole conversation, so you always know what a job cost. While the agent waits on an answer, the counts give their place to the question's progress.

## Project header

Open mu on a project and the top of the window tells you where you stand: the branch, what the repository has been doing over the year, and the prompts people keep starting with, which seed the composer in one keystroke. It also says when a folder is not a repository.

![Opening mu on a project](stories/ProjectHeader/opens.png)

## Looks

Three themes (Light, Dark, Nightsky) and nine accent colours, picked from the composer panels (`Ctrl+,` and `Ctrl+Shift+,`), previewed live as you arrow through the list, and saved. Multiple windows can be open on the same project, each on its own session.

![Light](stories/Looks/light.png)

![Dark](stories/Looks/dark.png)

![Nightsky](stories/Looks/nightsky.png)

![Nine accents, the list open on the current one](stories/Looks/accents.png)

---

## Keyboard

| Keys                           | Action                             |
| ------------------------------ | ---------------------------------- |
| `Enter`                        | Send                               |
| `Alt` + `Enter`                | New line                           |
| `Tab`                          | Autocomplete                       |
| `Ctrl` + `Shift` + `P`         | Commands                           |
| `Ctrl` + `L`                   | Models                             |
| `Ctrl` + `T`                   | Thinking level                     |
| `Ctrl` + `P`                   | Files                              |
| `Ctrl` + `H`                   | Session history (resume, delete)   |
| `Ctrl` + `R`                   | Search your past messages          |
| `Ctrl` + `K`                   | Project changes                    |
| `Ctrl` + `Shift` + `T`         | Conversation tree                  |
| `Ctrl` + `,`                   | Theme                              |
| `Ctrl` + `Shift` + `,`         | Accent color                       |
| `Ctrl` + `V`                   | Paste image                        |
| `Ctrl` + `C`                   | Clear draft and attachments        |
| `Ctrl` + `N`                   | New session                        |
| `Ctrl` + `Shift` + `N`         | New window                         |
| `Ctrl` + `PageUp` / `PageDown` | Previous / next conversation point |
| `Ctrl` + `U`                   | Delete to line start               |
| `Ctrl` + `W`                   | Delete word                        |
| `Ctrl` + `A` / `Ctrl` + `E`    | Line start / line end              |
| `Ctrl` + `]`                   | Jump to character                  |
| `Space`                        | Cycle a setting value              |
| `Esc`                          | Close panel                        |
