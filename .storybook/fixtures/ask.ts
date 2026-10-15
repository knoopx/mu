import { normalizeQuestions } from "../../src/plugins/interaction/lib/normalize";
import type {
  AskQuestion,
  AskRequest,
  AskUserDetails,
  AskUserParams,
} from "../../src/plugins/interaction/types";
import { photoOf } from "./media";
import { toolCallFixture, type ToolFixture } from "./tool";

const bay = photoOf("bay");
const stars = photoOf("stars");
const meadow = photoOf("meadow");

const CROP_QUESTIONS: AskQuestion[] = [
  {
    id: "crop",
    question:
      "How should the 48px photo strip crop a frame that is not a square?",
    context: [
      `The strip is a row of ${48}px squares with \`objectFit="cover"\`, and it never letterboxes.`,
      `${stars.name} is ${stars.width}×${stars.height}: a centre crop keeps the circle of trails and cuts the ridge.`,
      `${bay.name} is ${bay.width}×${bay.height}: a centre crop keeps the waterline and cuts the skyline.`,
      `${meadow.name} is ${meadow.width}×${meadow.height}: the fence post is at the right edge and a centre crop loses it.`,
      "The transcript and the file preview show the whole frame; only the strip is allowed to cut.",
    ].join("\n"),
    options: [
      {
        label: "Anchor top for portraits, centre for wide (Recommended)",
        description:
          "sf-bay-portrait.jpg keeps the skyline, star-trails.jpg keeps the ridge, nothing is letterboxed",
      },
      {
        label: "Centre for every frame",
        description:
          "What it does today: the ridge, the skyline and the fence post are all gone",
      },
      {
        label: "Use the EXIF focal point when present",
        description:
          "Best crop per photo, needs the EXIF read and a per-tile position",
      },
      {
        label: "Fit the whole frame in 48px",
        description:
          "Nothing is lost, and a strip of letterboxed squares reads as broken chrome",
      },
    ],
    allowMultiple: false,
  },
  {
    id: "preview",
    question: "What does the file preview do with a portrait photo?",
    context: [
      "The preview opens a file from disk in the panel above the composer.",
      `${bay.name} is 480×640 and ${bay.bytes} bytes: taller than the panel is wide.`,
      "The transcript image uses contain and the panel width is fixed, so a tall frame scrolls.",
    ].join("\n"),
    options: [
      {
        label: "Keep the aspect and let it scroll",
        description:
          "The whole photo is on screen, the panel scrolls, the aspect is honest",
      },
      {
        label: "Fit the frame to the panel height",
        description:
          "No scroll, and a wide photo shrinks to a band in the middle of the panel",
      },
      {
        label: "Crop to the panel",
        description:
          "Fills the panel and cuts the photo, which is the thing being fixed",
      },
    ],
    allowMultiple: false,
  },
];

export const ASK_QUESTIONS: AskQuestion[] = normalizeQuestions({
  questions: CROP_QUESTIONS,
} satisfies AskUserParams);

export const ASK_ARGS = { questions: CROP_QUESTIONS };

export const ASK_REQUESTS: AskRequest[] = ASK_QUESTIONS.map((question, i) => ({
  runId: "ask-photo-strip-crop",
  question,
  index: i + 1,
  total: ASK_QUESTIONS.length,
}));

export const ASK_ANSWERED: AskUserDetails = {
  answers: [
    {
      id: "crop",
      selected: ["Anchor top for portraits, centre for wide (Recommended)"],
    },
    {
      id: "preview",
      selected: [],
      custom:
        "Keep the aspect and scroll. A cropped preview is not evidence — the point of pasting a photo is that the model saw the whole frame.",
    },
  ],
  cancelled: false,
};

export const ASK_CANCELLED: AskUserDetails = {
  answers: [{ id: "crop", selected: ["Centre for every frame"] }],
  cancelled: true,
};

export const ASK_RUNNING: AskUserDetails = { answers: [], cancelled: false };

export const ASK_TOOL_ITEM: ToolFixture = toolCallFixture(
  "call-ask-answered",
  "ask-user",
  ASK_ARGS,
  "ok",
  "",
  { details: ASK_ANSWERED },
);

export const ASK_TOOL_ITEM_CANCELLED: ToolFixture = toolCallFixture(
  "call-ask-cancelled",
  "ask-user",
  ASK_ARGS,
  "ok",
  "",
  { details: ASK_CANCELLED },
);

export const ASK_TOOL_ITEM_RUNNING: ToolFixture = toolCallFixture(
  "call-ask-running",
  "ask-user",
  ASK_ARGS,
  "running",
  "",
  { details: ASK_RUNNING },
);
