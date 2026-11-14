# figures — a plot, read back as figures

One tool: `chart-render` (bars or a line, one or several series).

## What you get

- A chart painted in the log with its axis, range, total, mean and peak stated back in
  the answer — so a plot that came out wrong is visible without looking at it.
- Figures that survive a theme change and a resumed session, because a plot travels in
  `details` as data and never as a bitmap.

## How it works

`lib/plot.ts` is the contract for the shape. It reads what a call wrote **loosely** — a
bare value in a `points` slot is one value, not a crash — and refuses what it cannot
mean: a value that is not a number answers by naming the point and the cell it sat on,
so the next call can be right without re-deriving the whole series. The measure (axis
span, range, total, mean, peak, what fell off a cap) is computed once here, and a
program's `Chart` reads this same geometry rather than keeping its own, so a program's
plot and a tool's plot cannot drift.

**A multi-series plot has one accent and a ramp, not a palette.** The accent, two
lightness steps of that same hue, then greys stepped down a fixed ladder of contrast: a
categorical palette leaves every series equally loud and puts the destructive and warning
colours in the third bar as decoration.

`components/ChartToolRows.tsx` paints the chart and the legend a multi-series plot needs.

## Bounds

More points than the cap is a texture, not a picture: the answer says how many were not
plotted, which is the sign to group the values. A dot at every point of a long line is a
second series drawn over the first, so dots appear only on a run the eye can count. A bar
fills the slot its row gives it, and the point cap is the only thing that bounds how
narrow that slot gets — two categories are two wide bars, sixty are a comb, and both are
the plot the caller asked for. The tool name is what a guardrail rule points at, so it is
never renamed — and `table-render` and `tree-render` were figures here once, came out,
and their names are not to be reused.
