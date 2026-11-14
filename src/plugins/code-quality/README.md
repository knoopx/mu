# code-quality — six reads of the project itself

`code-complexity`, `code-dead-code`, `code-duplicates`, `code-review`,
`code-symbol-inspect`, `code-symbol-references`. All read-only: nothing here edits or
deletes.

## What you get

- Functions over the complexity thresholds, ranked worst first, with cyclomatic and
  cognitive scores, CRAP, and which threshold the finding tripped.
- Unused files, exports, types, members, and dependency hygiene (unused, unlisted,
  duplicated exports), each saying whether the fix is mechanical.
- Clone groups: the fingerprint, the line and token counts, and the file and line
  range of every instance, with the project's duplication percentage.
- Entity-level review of a commit: risk level, blast radius, whether the entity is
  public API, and how it changed.
- One file's surface — what it exports, how many files read each export, whether it
  is reachable — and one symbol's call chain, hop by hop in both directions.

## How it works

`lib/cli.ts` is the only file that names an analyser binary, and it is the only place a
flag appears. A tool names a subcommand, its scope and a limit — nothing else.
`lib/fallow.ts` reads the analyser's JSON envelope into mu's detail types,
`lib/answer.ts` is the head and the nothing-found branch every tool shares,
`lib/params.ts` states `limit` once for all six, and `lib/toolView.ts` folds the
details into rows core draws.

**The analyser is not the agent's concern.** No description, prompt snippet, guideline,
parameter description or answer text names the binary: an unavailable analyser is
reported as "the project analyser is not installed or not on PATH". The name survives
only in `constants.ts`, `lib/cli.ts`, and `details.analyzer`, which is app-side and
paints the log chip for the human.

A meter measures a figure the row prints — a complexity bar is scored on the CRAP that
sits beside it, because a bar nobody can read off the row is decoration.

## Bounds

The header's preview says the scope and nothing else; the counts belong to the row's
own summary line. A scope chip writes a path inside the project relative to the
project, because an absolute path spends the whole header on directories the reader is
already standing in.
