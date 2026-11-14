# mermaid — a diagram in the log, and a reading of it

One tool, `mermaid-render`. Flowcharts, sequence, state and class diagrams, ER,
gantt, git graphs, mindmaps, C4, timelines, kanban, quadrants and sankeys.

## What you get

- A picture painted in the transcript, and its SVG written to a path when the call
  names one, so a diagram can be committed or opened.
- A parse failure that arrives as `code`, `line`, `column` and the offending source
  line — never as a thrown parser error — so the fix is one line rather than a
  rewrite.
- A reading of the diagram handed to the model: the kind that was drawn, the canvas it
  was laid out on, and every label the diagram says. A label missing from that list is
  how a wrong source is caught without eyes.

## How it works

`lib/diagram.ts` is the only file that names the engine, which measures text from its
own metrics — no DOM, and no runtime asset to ship. `lib/palette.ts` is the only place
a diagram's colours are decided: the engine emits CSS custom-property roles and leaves
every `<text>` element unstyled, expecting a stylesheet it never ships, so the roles are
resolved against the app's theme and each text node is told its font, size and fill at
paint time, in the row. That is why the raw SVG markup travels in `details` and
`components/MermaidToolRows.tsx` draws the picture rather than the tool.

**A diagram gets no page of its own: the band it stands on is its page.** The engine
paints no canvas-covering rectangle, and the plate under an edge label and the interior
of a node exist only to cover what passes behind them — so both resolve to the band's
own fill. Any other colour there turns the picture into a plate with holes punched in
it. Grouping is the one thing that does get a fill, and it is a tint of the log rather
than a hiding of it.

## Bounds

There is deliberately no rasteriser: the raster backends are NAPI binaries whose loader
would read the one environment variable the Nix wrapper sets for the GPU binding, and
the picture is a vector the log scales to fit anyway. The tool name is what a user's
guardrail rule points at, so `mermaid-render` is never renamed.
