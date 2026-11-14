# vcs — jj as two panels and ten tools

The change stack (`ctrl+k`), the operation log (`ctrl+o`), and the ten names an
agent reaches a repository through. jj only: no git command is ever run.

## What you get

- Six reads — `vcs-log`, `vcs-file-diff`, `vcs-file-history`, `vcs-file-history-show`,
  `vcs-conflicts`, `vcs-oplog` — and three writes — `vcs-describe`, `vcs-file-split`,
  `vcs-hunk-split` — each answering in one status vocabulary (`ok`, `failed`,
  `unsupported`, `empty-selected`, `empty`, `none`, `binary`) rather than an exit code.
- A change stack that lists the changes, their files and their patches, and an
  operation log whose restore (`r`), undo (`u`) and redo (`U`) are the panel's own
  writes.
- Panel writes that need no judgement: `s` in the files pane splits the file under
  the cursor out of the change, `d` describes, `h` splits hunks, and squash, revert,
  drop, bookmark and push run in the panel. `s` on a whole change is the other case —
  grouping files into coherent commits needs a reader, so it goes to the agent as an
  instruction and lands as tool rows.
- Diffs drawn from rows, not from patch text: a `+` line is a tinted row of text with
  no marker and no line-number column, and its tokens come from the same tree-sitter
  runtime guardrails boots.

## How it works

`lib/ops.ts` is the only file in mu that names the change-tracking CLI: a tool names a
revision, files, hunks and a message and never a flag, and a write verifies itself by
re-resolving the post-state, so an answer reports the ids the repo resolved and never
the ones the caller typed. `lib/repo.ts` is what the panels read through — the same
runner, the panel's own writes beside it. `lib/answer.ts` is the only place a failure
is worded, and `lib/params.ts` states the bounded reads' `limit`/`offset`/`format` once.
One operation's patch comes back from a single `jj operation diff`, and `lib/opPatch.ts`
cuts it into file rows rather than asking per file; an operation's patch is immutable,
so it is cached.

## Bounds

The ten tool names are what a user's guardrail rule points at, so they are never
renamed or aliased. A write runs only when it was asked for — never speculatively, and
never as a rollback.
