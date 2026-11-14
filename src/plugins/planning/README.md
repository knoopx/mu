# planning — one list, replaced whole

One tool, `plan`. A plan is one ordered list of steps, and every call replaces the
whole list: there is no per-step update to reconcile and no store that could fall out
of step with the session.

## What you get

- A plan drawn in the log — each step's number in the log's id column, its words in the
  body, its standing in the pill column the list shares — with the header saying how far
  the work has got and which step it is on.
- The plan read back in the answer: the counts, then every step with its standing. That
  is the list the model re-sends with one word changed, rather than rebuilt from memory.
- A refusal that takes the whole call when a step cannot be read — an entry with nothing
  to do, or a standing outside `pending`/`in_progress`/`completed` — and names each
  offending step, with the fix being one field of one entry.
- The plan a resumed session ended with, because the steps ride in the call's `details`:
  the last plan row of the log *is* the plan.

## How it works

`lib/steps.ts` is the contract. It reads loosely — a bare string is a step not started,
one value named in the list slot is a list of one, `doing`/`done`/`In-Progress` fold to
the standing they mean — and refuses what it cannot mean, because a plan that quietly
lost its middle step is a different plan and the caller has no way to find out.
`lib/answer.ts` writes the reading; `lib/toolView.ts` folds the details into rows;
`components/PlanToolRows.tsx` only chooses words.

A step carries no owner and no delegation: it belongs to the session that wrote it. A
plan row has no chip line, because the head already counts the work and every step
already wears its standing — `plan` was the only tool whose chips restated figures its
own rows carried.

## Bounds

`MAX_PLAN_ROWS` bounds what the row draws and what the answer reads back, never what the
plan keeps, and the cut is counted. The name `plan` is what a user's guardrail rule
points at, so it is never renamed.
