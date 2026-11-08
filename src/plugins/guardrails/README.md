# Guardrails

Rules are the user's files, never the project's and never pi's. mu ships a registry,
a validator and an engine; it authors no rule.

| Where                                                   | What                                                                               |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `$XDG_CONFIG_HOME/mu/guardrails/<domain>.json`          | the rules — the filename **is** the domain, so a rule and its file cannot disagree |
| `$XDG_CONFIG_HOME/mu/guardrails/<domain>.fixtures.json` | the suite that proves that domain                                                  |
| `$XDG_STATE_HOME/mu/guardrails.json`                    | the arming the app remembers: `{ "armed": true, "disarmed": ["<domain>"] }`        |

`lib/rulesFile.ts` is the one that knows those paths, with `MU_GUARDRAILS_RULES` and
`MU_GUARDRAILS_FIXTURES` as overrides. `startGuardrails()` reads the rule files into
the registry at boot and `reloadGuardrails()` reads them again. One unreadable file
loses only its own rules; the panel names the trouble.

## A rule

An array of objects. `id`, `domain`, `message` and `query` must be non-empty, `id`
must be unique across **every** domain, `language` must name a shipped grammar, and
every `filters[].regex` must compile — `assertUsableRule` rejects the rule otherwise,
and a rule with a filter that cannot compile blocks nothing.

```jsonc
{
  "id": "py-subprocess-call", // unique across all domains
  "domain": "python", // ignored: the filename is the domain
  "language": "python", // the grammar the source is parsed in
  "message": "Use `subprocess.run([...], check=True)` — `subprocess.call` drops the exit status",
  "query": "((call function: (attribute object: (identifier) @mod attribute: (identifier) @fn)) (#eq? @mod \"subprocess\") (#eq? @fn \"call\"))",
  "capture": "mod", // which capture marks the match; the first when unset
  "tools": ["edit", "write"], // every guarded tool when unset
  "fields": ["newText", "content"], // the command keys when unset
  "filters": [
    // each must pass; `not` inverts one
    {
      "capture": "$",
      "regex": "^\\s*(?:sudo\\s+)?pnpm\\b",
      "flags": "m",
      "not": true,
    },
  ],
}
```

Matching runs `query` → `capture` → `filters`. A filter's `capture` names a capture
of the **same** match, or `"$"` for the whole guarded text; a filter naming a capture
the query never produces yields no text, so the rule does not fire. Every rule of the
source runs, armed or not: a disarmed match is recorded with `blocked: false` so the
transcript row shows what arming it would have stopped. Only an armed match blocks, and the block
reason carries **one** message — the earliest match, ties to registry order.

A `#match?` written on a bare `(program) @root` is ignored by the query engine, which
is why whole-command tests belong in `filters` with `capture: "$"`, where they are
checked. JS has look-around, so a command-head anchor is `(?:^|(?<=[;&|(`]))[ \t]*`with`"flags": "m"`.

## What the engine reads

A tool call is a list of **sources**, and each source is parsed in the grammar its own
key names. Rules with no `fields` read only command text, which is what every rule
written before file sources did.

| Tool                                                    | Keys read                                                               | Grammar      |
| ------------------------------------------------------- | ----------------------------------------------------------------------- | ------------ |
| `bash`, `shell`, `terminal`, `exec`, `run`              | `command`, `cmd`                                                        | `bash`       |
| `write`, `edit`, `create`, `multiedit`, `notebook-edit` | `content`, `newText`, `oldText`, `text` — the grammar comes from `path` | by extension |

`lib/treeSitter/source.ts` owns the extension map: `sh`, `py`, `js`, `jsx`, `mjs`,
`cjs`, `ts`, `mts`, `cts`, `tsx`, `rs`, `go`, `rb`, `java`, `php`, `css`, `regex`,
`ini`, `cfg`, `conf`, `ps1`, `psm1`, `c`, `h`, `cc`, `cpp`, `cxx`, `hpp`, `cs`. A path
with no entry carries text nothing can parse, so the call is released unread — a
`write` of a `.json` file is not guarded.

Sixteen grammars ship in `@vscode/tree-sitter-wasm` and every one is registered:
`bash, cpp, csharp, css, go, ini, java, javascript, php, powershell, python, regex,
ruby, rust, tsx, typescript`. `lib/treeSitter/grammar.ts` imports each wasm by name,
because `bun build --compile` embeds only files an import names. Boot loads only the
languages the registry names — 22 MB of wasm that no rule reads is 22 MB the app
never uses — and a language first used later is loaded on that call.

Everything is fail-open, on purpose: gpuix renders on a Rust UI thread that owns no
worker pool and Bun cannot start an embedded worker in a `--compile` binary, so a
parse is budgeted (`PARSE_BUDGET_MS`, 25 ms), text over `MAX_GUARDED_BYTES` (64 KiB)
is dropped, and a source whose grammar is missing, timed out or broken is released.
An extension handler that throws is a blocked call in pi, and a guardrail must never
become the thing that stops work.

## A fixture

An array, one case per object, in `<domain>.fixtures.json` beside the rules it proves.
Every rule needs a `block-*` case and an `ok-*` case: the first proves the rule fires,
the second proves it does not fire on a call that only looks alike. An `ok-*` case that
is a near-miss of the rule is worth two that are merely unrelated.

```jsonc
{
  "id": "block-css-important",
  "domain": "css",
  "event": {
    "type": "tool_call",
    "toolName": "edit",
    "toolCallId": "c1",
    "input": {
      "path": "panel.css",
      "oldText": "",
      "newText": "a { color: red !important; }\n",
    },
  },
  "expected": {
    "block": true,
    "reason_contains": "specificity",
    "note": "why this case exists",
  },
}
```

A command fixture is a `bash` call with `input.command`; a file fixture is a `write`
with `input.content` or an `edit` with `input.newText`, plus `input.path`, which is
what names the grammar. `guardrails-test` prints a `field` column naming the key it
read. `guardrails-fixture-update` writes suites and `guardrails-coverage` reads saved
session transcripts for the blocks each domain has really stopped — a domain that has
never fired is a domain nobody has proved.

## Checking

There is no CLI entry: the three tools are agent tools, and they run inside a
running mu session, where `startGuardrails()` has already loaded the rule files from
disk. Ask the agent to run `guardrails-test` (every suite, or one `domain`, or one
`domain` and `fixture`) and `guardrails-coverage` (the blocks each domain has really
stopped since a window of sessions); the report is the same table either way, and a
failing fixture is a failing row. The tools evaluate
against the registry of the running process, which loads at boot — rules written
while the app runs take effect on its next start, and the agent never arms, disarms,
clears the log or dry-runs: arming is the panel's, driven by `/guardrails` and the
composer keybinding.
