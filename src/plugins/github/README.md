# github — nine reads, no CLI

`github-repo`, `github-file`, `github-tree`, `github-pr`, `github-issue`,
`github-release`, `github-commit`, `github-search`, `github-user`. All read-only:
nothing in mu comments, merges, closes or pushes.

## What you get

- A repository's facts (description, stars, licence, default branch), a folder
  listing, one file's text, a pull request with its changed files, an issue with its
  comments, one release or the recent ones, a commit with the files it moved, a
  search across repositories/issues/users, and a profile.
- A 24-hour cache under `$XDG_CACHE_HOME/mu/github`, so a research session does not
  spend its rate limit rereading the same page; `refresh: true` skips the cache and
  asks GitHub live.
- Signed reads when the environment holds `GITHUB_TOKEN`/`GH_TOKEN`; without one,
  code and commit search answer `unsupported` **before** the request is made, rather
  than as a 401 nobody can act on.
- One card per kind in the log — a record band, a code panel, a file tree, a
  changeset, a reply thread, a release track, a hit list, an avatar — because none
  of the nine shapes is shaped like another.

## How it works

`lib/api/client.ts` is the only file in mu that names a host, and the only one that
owns the timeout, the cache and the wording of an HTTP refusal. `lib/api/record.ts`
is the only reader of GitHub's JSON and never trusts it. `lib/api/read/<kind>.ts` is
what a kind *is* — endpoints, caps, and the guard that answers before a request when
the scope cannot name the thing; `lib/kinds/<kind>.ts` is what a kind *says* — the
word for one of its rows, what an empty read means, the columns its rows answer in
for the model, and the figures it trails in the log. `lib/kinds/vocabulary.ts` is the
only table that knows all nine, so nothing downstream branches on kind by hand and
adding a kind is two files and one row in that map.

A fact is stated once: the header's scope line owns the repository, path, number,
sha and query, so no figure repeats them; the changeset rows own the file list, so no
figure counts it; a description is GitHub's prose, so it is the call's body and not a
field the answer prints twice.

## Bounds

The nine names are what a user's guardrail rule points an agent at, so they are never
renamed or aliased. Every list is capped in `constants.ts` and the answer counts what
fell off.
