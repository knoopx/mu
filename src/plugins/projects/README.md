# projects — every folder mu has worked in, and a window at any one of them

`ctrl+shift+j` (or `/projects`) opens the list; Enter starts a mu window at the folder under the
cursor. The list is not a folder scan — it is mu's own session store, so what it offers is the set
of places somebody has actually worked, ranked by how recently one of them was written to.

## What you get

- A panel of every project that has sessions, each row naming the folder, where it sits, how many
  sessions it holds and how long ago mu last worked there — newest first, so the project you want
  is usually the one at the top.
- A filter over name and path, and a check on the row for the folder this window is already in.
- A new window at the picked path, with its own session: the transcript you were reading stays
  where it was, because a mu window _is_ a working directory.
- Nothing offered for a folder that is no longer on disk.

## How it works

pi files sessions under `<agent dir>/sessions/<folder for the cwd>/*.jsonl`, so the parent dir of a
session file is one working directory. `lib/projectStore.ts` walks those folders once per window —
a `readdir` and a `stat` each, no transcript bodies — and takes the path from the `cwd` in the first
line of the folder's newest session file. The folder name is only a safe spelling of a path (`/`
and `-` both become `-`), so it cannot be read back on its own; it is the fallback for a file whose
header cannot be read. Two folders that spell one path are one project with both histories, and a
path the disk no longer holds is dropped rather than offered.

`lib/openProject.ts` launches mu at the picked path through the app's own launch (`src/window/`),
and the notice waits for the child's own `spawn` event — a folder that went away since it was
listed is reported, not promised.

## What it does not do

- It registers no agent tool. Choosing which project a window belongs to is a thing the person
  does, not a thing the model is asked to do mid-turn.
- It does not move this window. The agent session, the file panel, the repo panels and every
  relative path in the log hang off the folder the window started in, and repointing that under a
  running conversation would leave the transcript talking about one folder while the tools answered
  in another.
- It does not scan the filesystem for repositories. A folder with no session has never been worked
  in here, and the panel says so with its own empty line rather than inventing a project.
