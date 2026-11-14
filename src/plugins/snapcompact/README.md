# snapcompact

mu compacts a context by **photocopying it**, not by asking a model to reread it.

The discarded turns are serialized to compact text, and that text is printed — in
a pixel font, black on white, one page per ~14k characters — into dense PNGs a
vision model reads back directly. The pass is local and deterministic: no model
call, no API key, nothing billed, and what comes back is the archive plus a short
guide that says how to read it.

This is [`@oh-my-pi/snapcompact`](https://github.com/can1357/oh-my-pi)'s engine
(the serializing, the normalizing, the shape table, the rasterizer, the PNG
encoding, the reading guide), wired into pi's compaction lifecycle. mu writes no
rasterizer of its own.

## The shape of a pass

| Stage                                                                                                       | Who owns it                      |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------- |
| When to compact at all, and where the cut point is                                                          | pi (`compaction.*` settings)     |
| Serializing the discarded span, folding in the previous archive, planning the layout, rasterizing, encoding | the package                      |
| Which shape a reader earns, how many frames it may carry, what its provider takes inline                    | the package, read off the reader |
| Holding the frames in the compaction entry, re-attaching them to every request, the transcript's words      | mu                               |

Frames are **not** stored in the context. pi rebuilds every request from the
session file, so `lib/replay.ts` rebuilds the archive from the entry's `details`
on each request: the oldest and newest turns as text, the pages between them, all
inside one message (pi's `custom` role is the only one whose blocks can mix text
and images).

A pass that would produce no pages — a short history fits between the two text
edges, so nothing was compressed — is declined, and pi's summarizer answers
instead. Same for `/compact focus on X`, which asks for a _reading_ of the
history, and for a reader that takes no images: there is nothing to read a page
with. A session that moves to a text-only model after an archived pass still gets
its history, as text, through the package's own `viewWithoutFrames`.

## Switch

`~/.config/mu/snapcompact.json` — mu's file, never the project's:

```json
{
  "enabled": true,
  "maxFrames": 24,
  "shape": "auto"
}
```

| Key         | Meaning                                                                                |
| ----------- | -------------------------------------------------------------------------------------- |
| `enabled`   | `false` leaves every compaction to pi's summarizer                                     |
| `maxFrames` | mu's ceiling on pages per archive (1–80; the package clamps to its own 80)             |
| `shape`     | `"auto"`, or a package variant name such as `"11on16-bw"` or `"8on22-bw"` to force one |

`MU_SNAPCOMPACT_CONFIG` overrides the path of that file. A missing file, an
unreadable one, or a key of the wrong type all answer with the defaults: mu
compacts as above, and one bad value never costs a session its archive. There is
no panel and the agent cannot flip it — arming a compaction is not something the
agent gets to decide, exactly as guardrails' arming is not.

## The dependency, and what it costs

`@oh-my-pi/snapcompact` is TS source and ships no build step, but it is written
for oh-my-pi's own package family, so it pulls in `pi-ai`, `pi-catalog`,
`pi-utils`, `pi-wire`, `omptype`, and — the one that matters —
`@oh-my-pi/pi-natives`, whose rasterizer lives in a **128 MB** prebuilt native
addon. What that costs mu:

- **~2 MB** added to the `bun --compile` binary (the JS and catalog data; bun's
  own runtime dominates the binary either way).
- **one `.node`** beside the executable, which the addon's loader looks for in
  `dirname(process.execPath)` inside a compiled binary. `flake.nix` copies the
  baseline x64 build into `$out/lib/`; an AVX2 CPU falls back to it by name.
- **one dlopen, paid late**: `lib/load.ts` imports the package on the first
  compaction that needs it, never at startup, so a session whose model takes no
  images never touches the addon at all.
- **one compaction's worth of work**, measured here: a 216k-character history
  became 14 pages in 45 ms, and the session file carrying it grew to 880 KB.

mu's model type and the package's are forks of pi's, and the two agree exactly
where the package looks: `provider`, `api`, `id`, `baseUrl`, `reasoning`, and the
image-input axis. `lib/reader.ts` is the one place that cast lives.
