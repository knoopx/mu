import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, userTurn, usage } from "../turn";

const FRAME_LIST = [
  ".pi/agent/sessions/2026-11-08T09-14-02-…/frames/001.png  1 742 × 2 338  412 KB",
  ".pi/agent/sessions/2026-11-08T09-14-02-…/frames/002.png  1 742 × 2 338  388 KB",
  "span: 249 925 characters · 12 turns · cut at the 0.80 threshold",
].join("\n");

export const SNAPCOMPACT_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-frames",
    "the session compacted and the middle of it is gone from the summary — did anything actually survive, or did we just lose a day of work",
    0,
  ),
  {
    kind: "system",
    id: "s-compacted",
    text: "Compacted · 2 frames archived · span of 249 925 characters · summary replaced by the frame reader's guide",
  },
  ran(
    "c-frames",
    "bash",
    { command: "ls -l $(mu frames --session current)" },
    FRAME_LIST,
    2_000,
  ),
  ran(
    "c-replay",
    "bash",
    { command: "mu replay --session current --explain" },
    [
      "request rebuilt from the session file: 61 messages kept + 1 custom message holding the 2 frames",
      "the frames go in on every request, not once — a guide pointing at pages that are not there would be a lie",
      "reader: local/ostfralla/Qwen3.8-27B · image input: yes",
    ].join("\n"),
    5_000,
  ),
  {
    ...answer(
      "a-frames",
      [
        "Nothing was lost, and the summary is not where you should look for it. The discarded span was printed — pixel font, black on white, about fourteen thousand characters to a page — into two PNGs, and those two pages are re-attached to every request this session makes, standing in for the summary message. The model reads its own history instead of paying for a paraphrase of it.",
        "",
        "What is genuinely gone is the *text* of that span: ask for an exact string from Tuesday and the answer comes from reading the picture, not from the transcript. If this session moves to a model with no image input, the frames stop going in and pi's own summarizer takes the span back — the history survives either way, just as prose.",
      ].join("\n"),
      {
        reasoning:
          "The question was about loss, so the answer has to say what is stored, where it is attached, and what the reader can and cannot recover from it. The frame files and the replay explanation are the evidence; the note in the log is what the person saw and mistrusted.",
      },
    ),
    usage: usage(21_800, 940, 0, 1, 2),
  },
];
