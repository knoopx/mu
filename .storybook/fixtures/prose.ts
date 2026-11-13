export const PREVIEW_ANSWER = [
  'I looked at all three, and at what the tile keeps of each. The strip is a 48px square with `objectFit="cover"` and no position, so every crop is a centre crop; the transcript image and the file preview both use `contain`, so they show the whole frame.',
  "",
  "| file | frame | what the 48px strip keeps | what the preview shows |",
  "| --- | --- | --- | --- |",
  "| `sunlit-meadow.jpg` | 640×360 | the middle band of grass — the fence post at the right edge and the flare low centre are both cut | all of it |",
  "| `star-trails.jpg` | 640×360 | the circle of trails — the black ridge across the bottom third is cut | all of it |",
  "| `sf-bay-portrait.jpg` | 480×640 | a band across the waterline — the skyline and the bridge are cut | all of it |",
  "",
  "Nothing is stretched and nothing is letterboxed: the aspect is kept and the edges are cut. The loss is not random, and it is not the photo's fault — it is the centre of every frame, chosen by the tile and not by the picture.",
  "",
  "The meadow is the one that cannot be fixed by an anchor: its subject is the flare and the post, and they are at opposite edges. A 48px square can carry the grass, or the post, or the flare. It cannot carry the photograph.",
].join("\n");

export const PREVIEW_FIX_ANSWER = [
  "Done, and the strip is still 48px. The crop is now decided by the frame, not by the tile:",
  "",
  "- a frame taller than it is wide is anchored **top** — `sf-bay-portrait.jpg` keeps the skyline and the bridge, and drops the water at the bottom",
  "- a frame wider than it is tall is anchored **centre** and cropped at the sides — `star-trails.jpg` keeps the ridge across the bottom, because the sides of a night sky are the only thing there worth cutting",
  "- `underwater-swimmer.jpg` is untouched by the rule: 16:9, subject centre, and the crop it gets today is the crop it wants",
  "",
  "`bun run typecheck` is clean, and the panel that opens on the composer is unchanged — only the crop inside each tile moved.",
].join("\n");

export const PREVIEW_STREAM =
  "The read preview opens the same file the transcript shows, so it keeps the aspect there too: the frame is fitted to the panel's width, the height follows the ratio, and a portrait photo costs the reader one scroll instead of a crop. The strip in the composer is the one place a photo is cut, and after this change it is cut on purpose, by";

export const PREVIEW_REASONING = [
  "Three renderers, three jobs, and only one of them is allowed to cut the frame:",
  "",
  '- the composer strip is a row of 48px squares whose job is "this is attached"',
  "- the transcript image is evidence — the user pasted it to be looked at, so it has to be complete",
  "- the file preview opens a file from disk and must not resize it to fit a card",
  "",
  "A centre crop of a 16:9 frame into a square keeps the middle of the width. For the meadow that is grass with nothing in it: the post is at the right edge and the flare is low centre, so the crop keeps neither. For the star trails the centre is the circle of trails, and the ridge — the only land in the frame — is gone.",
  "",
  'The fix cannot be "crop less". A 48px square cannot hold a 16:9 frame without letterboxing, and a strip of letterboxed squares reads as broken chrome, which is why `cover` is the right fit and `contain` is not.',
  "",
  "So the anchor is the only knob, and it has to be computed per frame: portrait frames put their subject high, wide frames put theirs in the middle. That is a function of the two dimensions I already have from `identify`, not a guess.",
].join("\n");

/** The note as it lands in `RELEASE_NOTES.md` — the file the write paints. */
export const PREVIEW_RELEASE_NOTES = [
  "## The photo strip crops; the preview does not",
  "",
  'A photo pasted into mu is shown in three places, and each one makes a different promise. The strip in the composer says "this is attached". The transcript shows what the model was shown. The file preview opens a file from disk.',
  "",
  "### The three frames",
  "",
  "| where | fit | what a 16:9 photo loses |",
  "| --- | --- | --- |",
  "| composer strip, 48px | cover, anchored | the edges, on purpose |",
  "| transcript image | contain | nothing |",
  "| file preview | contain | nothing |",
  "",
  "### The anchor, by frame",
  "",
  "- `sf-bay-portrait.jpg` (480×640) is anchored **top**: the skyline and the bridge stay, the water leaves",
  "- `star-trails.jpg` (640×360) is cropped at the sides: the ridge stays, and the empty sky goes",
  "- `underwater-swimmer.jpg` (640×360) is already centred on its subject, so the rule leaves it alone",
  "- `sunlit-meadow.jpg` (640×360) is the frame the tile cannot serve: the post and the flare are at opposite edges, so a 48px square keeps one of them",
  "",
  "### Why the preview keeps the aspect",
  "",
  "> A pasted photo is evidence. The moment the transcript crops it, the user cannot tell what the model was shown.",
  "",
  "```sh",
  "identify ~/Pictures/2026/*.jpg    # the frames the strip has to survive",
  "bun storybook . --only Chat       # stories/Chat/session.png",
  "```",
  "",
  "A portrait photo costs one scroll in the preview. That is the whole price of showing a photo honestly, and it is paid by the preview, not by the photo.",
].join("\n");

/** What the agent says after writing it: the report, not the note again. */
export const PREVIEW_RELEASE_ANSWER =
  "`RELEASE_NOTES.md` is written, and the table in it is the part worth arguing with: the strip crops on purpose, the transcript and the preview show the whole frame, and a portrait costs one scroll in the preview and nothing in the strip.";

export const PREVIEW_COMPARE = [
  "Neither of them is cropped in the preview — the preview is `contain`, so both frames are whole. What you get of each:",
  "",
  "- **`underwater-swimmer.jpg`** (640×360, 18 784 bytes) fits the panel width, and the dark head sits in the middle with the fan of bubbles above it; it is the darkest file in the folder, and the tile is mostly water",
  "- **`chicago-river.jpg`** (640×360, 36 688 bytes) is the same shape and nearly twice the bytes: the brick on both sides, the boat bottom right, the footbridge across, the haze at the vanishing point",
  "",
  "The strip is where a photo loses pixels, and it is the only place it does.",
].join("\n");

export const CHANGES_ANSWER = [
  "Named and split, both from the panel: `6d1c4b0a` now reads `feat(changes): send describe and split to the agent`, and `stories/Changes/panel.png` is its own change, `1c7f9a44`, with the source files left in `8b2d63e0`.",
].join("\n");
