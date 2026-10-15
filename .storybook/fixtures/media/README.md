# fixture media

Real photographs, pulled from `https://picsum.photos/seed/<seed>/<w>/<h>.jpg`,
used as the image fixtures. They exist only where a story demonstrates an
image: pasted in the composer strip, opened in the transcript by the agent's
`read`, listed by `ls`, measured by `identify`, asked about in the ask panel.

| file                     | seed                 | frame   | bytes  | what is in it                                                            |
| ------------------------ | -------------------- | ------- | ------ | ------------------------------------------------------------------------ |
| `sunlit-meadow.jpg`      | `mu-morning-ridge`   | 640×360 | 27 322 | sun through dry grass, a fence post hard right, flare low centre         |
| `underwater-swimmer.jpg` | `mu-desk-mockup`     | 640×360 | 18 784 | deep blue water, a swimmer's head as a dark shape, bubbles above         |
| `chicago-river.jpg`      | `mu-gallery-print`   | 640×360 | 36 688 | a river between brick buildings, a boat bottom right, a footbridge, haze |
| `star-trails.jpg`        | `mu-monitor-photo`   | 640×360 | 18 335 | star trails in circles, a black ridge across the bottom third            |
| `sf-bay-portrait.jpg`    | `mu-poster-portrait` | 480×640 | 40 638 | water below, a skyline and a bridge on the far shore, empty sky above    |

Four frames are 16:9 and one is a 3:4 portrait, which is the whole point: the
48px strip centre-crops, and a centre crop of a 16:9 frame cannot keep a
horizon. Every prompt, tool output and answer in `.storybook/fixtures/`
describes the pixels in this table — the byte counts, the frames, the crops,
and what each crop loses.

Sizes are stable per seed. Re-pull with:

```sh
cd .storybook/fixtures/media
curl -sL -o sunlit-meadow.jpg      "https://picsum.photos/seed/mu-morning-ridge/640/360.jpg"
curl -sL -o underwater-swimmer.jpg "https://picsum.photos/seed/mu-desk-mockup/640/360.jpg"
curl -sL -o chicago-river.jpg      "https://picsum.photos/seed/mu-gallery-print/640/360.jpg"
curl -sL -o star-trails.jpg        "https://picsum.photos/seed/mu-monitor-photo/640/360.jpg"
curl -sL -o sf-bay-portrait.jpg    "https://picsum.photos/seed/mu-poster-portrait/480/640.jpg"
```
