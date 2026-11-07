# Guardrails on disk

Guardrails are mu's own files, in the user's directories. Nothing about them
lives in a project's tree, and nothing is read from another program's
configuration: the rule set, the suites that prove it, and the switches the
panel flips all belong to the person running the app.

```
$XDG_CONFIG_HOME/mu/guardrails/package-manager.json           rules
$XDG_CONFIG_HOME/mu/guardrails/package-manager.fixtures.json  the suite for those rules
$XDG_STATE_HOME/mu/guardrails.json                            which domains are armed
```

Defaults with the usual XDG setup are `~/.config/mu/guardrails/` and
`~/.local/state/mu/guardrails.json`. `MU_GUARDRAILS_RULES` and
`MU_GUARDRAILS_FIXTURES` point the two loaders somewhere else — a test, a
dotfile repo, a synced folder.

## Rules — `<domain>.json`

One file per domain, named after it: `package-manager.json`, `nix.json`,
`jj.json`. A file is an array of rules, and a rule is one query, one domain and
one correction:

```json
{
  "id": "pkg-npm",
  "language": "bash",
  "query": "(command) @root",
  "capture": "root",
  "filters": [{ "regex": "(^|\\s)npm\\s+(i|install|add)\\b" }],
  "message": "Use Bun equivalents: bun add, bun run, bun install"
}
```

- `id` is kebab-case and unique across every file: a hit, a panel row and a
  suite note all name a rule by it.
- `domain` is taken from the filename, so a rule and its file can never
  disagree.
- `language` is the grammar the command is parsed as; only `bash` ships a
  grammar today.
- `query` is the tree-sitter query, `capture` the node read out of it, and
  `filters` the JS regexes a captured text must pass. A query that matches the
  whole command is how a whole-command test is written, with the test itself in
  `filters` — a `#match?` on a bare `(program)` root is ignored by the query
  engine.
- `message` is the correction the agent is handed when a call is blocked. A
  rule with no message stops a command and offers nothing, so it is refused.

The registry validates on the way in: an empty id, an id used twice, a rule
with no domain, no message, no query, a language with no shipped grammar, or a
filter that is not a compilable regex is refused. A file that is not valid JSON
loses its own rules and reports itself in the panel's status line; the readable
files still register, so one typo never leaves the app guarding nothing. A rule
is read at startup and on every reload of the panel — mu writes no rules.

## Fixtures — `<domain>.fixtures.json`

The suite sits beside the rules it proves, and the suffix is the only
difference. Each file is an array of fixtures, and a fixture is one command and
the verdict it deserves:

```json
{
  "id": "block-npm-i",
  "domain": "package-manager",
  "event": {
    "type": "tool_call",
    "toolName": "bash",
    "input": { "command": "npm i zod" }
  },
  "expected": {
    "block": true,
    "reason_contains": "Use Bun",
    "note": "npm is not the runner in a Bun project"
  }
}
```

- `id` is kebab-case and stable: `block-*` for a true positive, `ok-*` for a
  false positive. A suite run names a case by it.
- `expected.block` is the verdict. `reason_contains` pins the text the model is
  handed when a call is blocked — pin it when the wording of the correction is
  the point of the rule. `note` says why the case exists, for whoever reads the
  suite next.
- `domain` is the label written into the record; `bash` is the tool a record
  runs against unless `event.toolName` says otherwise.

Every rule needs a `block-*` case and an `ok-*` case. The first proves the rule
fires; the second proves it does not fire on a command that only reads alike —
`grep -r sleeping src` is not a `sleep`, `bun run build --group` is not a global
install. A rule with only true positives is a rule that has never been asked
not to fire.

Suites are written and run by the agent's own tools: `guardrails-fixture-update`
adds, updates and deletes cases in place, `guardrails-test` runs a suite, a
domain or a single case against the live engine, and `guardrails-coverage`
reports which domains have fired in real sessions and which never have.

## Arming — `$XDG_STATE_HOME/mu/guardrails.json`

```json
{ "armed": true, "disarmed": ["sleep", "nix"] }
```

What the panel flips, mu remembers: the master switch and the domains disarmed
by name. It is state, not configuration — the app writes it, a person edits the
rules. A domain joins the armed set when its rule file appears, so adding a
rule needs no migration, and a disarmed domain keeps its matches in the log so
the panel still shows what would have blocked.
