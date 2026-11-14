# interaction — the agent asks, you answer

One tool, `ask-user`, and the panel it opens. The agent puts a multiple-choice
question in the composer; the answer comes back as your own message, sent by you.

## What you get

- A question panel over the composer: the question, its context, and its options as
  rows with their descriptions.
- Several questions in one call, answered in order, each with a stable `id` so the
  answer can be mapped back to what it chose.
- A single-select or a multi-select, and a free-form answer: Tab types an answer of
  your own, Ctrl+G attaches extra context.
- The turn's abort and the panel's Cancel control close it rather than leaving the
  agent waiting on a question nobody will answer.

## How it works

`tools/askUser.ts` is the tool; `components/AskComposer.tsx` draws the panel and
owns its keys and its wording; `hooks/` wires the panel's state. The tool's answer
is a plain string the harness hands back — the panel never sends anything on your
behalf, which is the whole point: a choice the agent attributes to you has to have
been made by you, in the composer, beside what you were already typing.

## Bounds

The tool's name is what a user's guardrail rule points at, so `ask-user` is never
renamed or aliased.
