import type { SessionTreeNode } from "@earendil-works/pi-coding-agent";

const T0 = Date.parse("2026-11-07T09:14:00.000Z");
const at = (minutes: number): string =>
  new Date(T0 + minutes * 60_000).toISOString();

const LOCAL = "local/ostfralla/Qwen3.8-27B";
const CLOUD = "openrouter/anthropic/claude-sonnet-4.5";

const text = (value: string): Array<{ type: "text"; text: string }> => [
  { type: "text", text: value },
];

const node = (
  entry: Record<string, unknown>,
  children: SessionTreeNode[] = [],
): SessionTreeNode => ({ entry, children }) as unknown as SessionTreeNode;

const message = (
  id: string,
  parentId: string | null,
  minutes: number,
  payload: Record<string, unknown>,
  label?: string,
): SessionTreeNode =>
  node({
    id,
    parentId,
    type: "message",
    timestamp: at(minutes),
    message: payload,
    label,
  });

const user = (
  id: string,
  parentId: string | null,
  minutes: number,
  value: string,
  label?: string,
): SessionTreeNode =>
  message(id, parentId, minutes, { role: "user", content: text(value) }, label);

const assistant = (
  id: string,
  parentId: string | null,
  minutes: number,
  value: string,
  model = LOCAL,
  stopReason = "stop",
): SessionTreeNode =>
  message(id, parentId, minutes, {
    role: "assistant",
    content: text(value),
    model,
    stopReason,
  });

const tool = (
  id: string,
  parentId: string | null,
  minutes: number,
  toolName: string,
  value: string,
  isError = false,
): SessionTreeNode =>
  message(id, parentId, minutes, {
    role: "toolResult",
    toolName,
    content: text(value),
    isError,
  });

const modelChange = (
  id: string,
  parentId: string | null,
  minutes: number,
  provider: string,
  modelId: string,
): SessionTreeNode =>
  node({
    id,
    parentId,
    type: "model_change",
    timestamp: at(minutes),
    provider,
    modelId,
  });

export const SESSION_TREE_FIXTURE: SessionTreeNode[] = [
  node(
    {
      id: "p1",
      parentId: null,
      type: "session_info",
      timestamp: at(0),
      name: "photo strip crop",
    },
    [
      modelChange("p2", "p1", 0, "local", LOCAL),
      user(
        "p3",
        "p2",
        1,
        "three photos, one tile each in the strip. the meadow loses the fence post, the star trails lose the ridge, the portrait loses the skyline. look at them before you answer",
      ),
      assistant(
        "p4",
        "p3",
        1,
        "Reading the three frames and the strip styles first",
        LOCAL,
        "toolUse",
      ),
      tool(
        "p5",
        "p4",
        2,
        "bash",
        "identify: four at 640x360, sf-bay-portrait.jpg at 480x640",
      ),
      tool(
        "p6",
        "p5",
        2,
        "read",
        "Read image file [image/jpeg] · sf-bay-portrait.jpg",
      ),
      tool(
        "p7",
        "p6",
        3,
        "grep",
        "src: 5 hits for objectFit — two cover in the strip, two contain in the preview",
      ),
      node(
        {
          id: "p8",
          parentId: "p7",
          type: "compaction",
          timestamp: at(4),
          summary:
            "The strip is a 48px square with a centre cover crop; the transcript image and the file preview contain the whole frame. The meadow keeps neither the post nor the flare.",
          firstKeptEntryId: "p7",
          tokensBefore: 38_910,
        },
        [
          assistant(
            "p9",
            "p8",
            5,
            "The strip is the only place a photo loses pixels, and it always loses the edges",
          ),
          node(
            {
              id: "p9a",
              parentId: "p9",
              type: "message",
              timestamp: at(5.5),
              label: "fit=contain",
              message: {
                role: "user",
                content: text(
                  "what if the strip just contains the whole frame in 48px?",
                ),
              },
            },
            [
              tool(
                "p9b",
                "p9a",
                6,
                "read",
                "Read image file [image/jpeg] · star-trails.jpg",
              ),
              assistant(
                "p9c",
                "p9b",
                6,
                "A strip of letterboxed squares: the tile reads as broken chrome and the photo is 22px tall",
              ),
            ],
          ),
          user(
            "p10",
            "p9",
            6,
            "keep the tile at 48px. anchor the crop on the frame: top when it's taller than wide, centre when it's wide. no letterboxing in the strip",
          ),
          tool(
            "p11",
            "p10",
            7,
            "edit",
            "Successfully replaced 1 block(s) in src/plugins/core/components/composer/attachments.tsx.",
          ),
          tool(
            "p12",
            "p11",
            8,
            "bash",
            "Found 1 error in src/plugins/core/components/composer/attachments.tsx:176",
            true,
          ),
          user(
            "p13",
            "p12",
            9,
            "that's not a style key in this renderer — objectPosition is a prop on the image, put it where objectFit already lives",
            "renderer",
          ),
          assistant(
            "p14",
            "p13",
            10,
            "Anchor moved onto the image element, typecheck clean: portrait anchored top, wide cropped at the sides",
          ),
          user(
            "p15",
            "p14",
            14,
            "now open the swimmer and the river from disk in the preview and tell me which one the panel crops",
          ),
          node(
            {
              id: "p14a",
              parentId: "p14",
              type: "message",
              timestamp: at(13),
              label: "per photo",
              message: {
                role: "user",
                content: text(
                  "or keep a table of anchors per photo, one line each",
                ),
              },
            },
            [
              assistant(
                "p14b",
                "p14a",
                13,
                "A table is a rule with the reasoning thrown away: the fifth photo in the folder needs a sixth line",
              ),
            ],
          ),
        ],
      ),
      modelChange("p16", "p15", 17, "openrouter", CLOUD),
      assistant(
        "p16b",
        "p16",
        18,
        "Neither is cropped in the preview — both frames are whole; the strip is where the pixels go",
        CLOUD,
      ),
      tool(
        "p17",
        "p16b",
        19,
        "read",
        "Read image file [image/jpeg] · chicago-river.jpg",
        false,
      ),
      node(
        {
          id: "p18",
          parentId: "p15",
          type: "message",
          timestamp: at(20),
          label: "contact sheet",
          message: {
            role: "user",
            content: text(
              "build me a contact sheet of the four 16:9 frames at 318x180 so i can see the crops side by side",
            ),
          },
        },
        [
          tool(
            "p19",
            "p18",
            21,
            "bash",
            "montage: 4 tiles at 318x180; sf-bay-portrait.jpg skipped: 480x640 is not 16:9",
            true,
          ),
          assistant(
            "p19b",
            "p19",
            22,
            "The portrait is the frame the box cannot take — same rule as the strip, one level up",
            CLOUD,
          ),
          user(
            "p20",
            "p19b",
            23,
            "leave the portrait out of the sheet, it's the only 3:4 in the folder. write the release note for the strip and the preview",
            "notes",
          ),
        ],
      ),
      assistant(
        "p21",
        "p20",
        24,
        "Release note drafted: the strip crops on purpose, the preview never does",
        CLOUD,
      ),
      user("p22", "p21", 33, "and the same paragraph for the read preview"),
    ],
  ),
];

export const SESSION_TREE_LEAF_ID = "p20";
