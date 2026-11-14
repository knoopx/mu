# figures — a plot and a tree, both read back as figures

Two tools: `chart-render` (bars or a line, one or several series) and `tree-render`
(anything that nests: a package's folders, a module graph, a call chain, a changeset).

## What you get

- A chart painted in the log with its axis, range, total, mean and peak stated back in
  the answer — so a plot that came out wrong is visible without looking at it.
- A tree painted as nested nodes that open and close under the cursor, and the same
  tree walked back as indented text, so a leaf one level too deep is catchable.
- A changeset tree when the nodes carry `added`/`removed`: the log draws `+N −M`
  columns measured across the whole tree.
- Figures that survive a theme change and a resumed session, because a plot travels in
  `details` as data and never as a bitmap.

## How it works

`lib/plot.ts` and `lib/structure.ts` are two contracts for the two shapes. Both read
what a call wrote **loosely** — a bare value in a `children` slot is one child, not a
crash — and refuse what they cannot mean: a value that is not a number answers by naming
the point and the cell it sat on, and a node with no name refuses the whole call and
names the parent it hangs under. The measure (axis span, range, total, mean, peak, depth,
what fell off a cap) is computed once here, and a program's `Chart` reads this same
geometry rather than keeping its own, so a program's plot and a tool's plot cannot drift.

**A multi-series plot has one accent and a ramp, not a palette.** The accent, two
lightness steps of that same hue, then greys stepped down a fixed ladder of contrast: a
categorical palette leaves every series equally loud and puts the destructive and warning
colours in the third bar as decoration.

`components/ChartToolRows.tsx` paints the chart and the legend a multi-series plot needs;
`components/TreeToolRows.tsx` paints the tree through adwaita's own file tree.

## Bounds

More points than the cap is a texture, not a picture: the answer says how many were not
plotted, which is the sign to group the values. A dot at every point of a long line is a
second series drawn over the first, so dots appear only on a run the eye can count. A bar
fills the slot its row gives it, and the point cap is the only thing that bounds how
narrow that slot gets — two categories are two wide bars, sixty are a comb, and both are
the plot the caller asked for. The two tool names are what a
guardrail rule points at, so they are never renamed — and `table-render` was a third,
came out, and its name is not to be reused.
