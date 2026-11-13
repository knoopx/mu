import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, failed, ran, usage, userTurn } from "../turn";

const SESSION_DIR =
  "--home-knoopx-Projects-gpuix-apps-mu--/2026-11-07T09-14-00-000Z_019a4c1e.jsonl";

const SESSION_ROWS = [
  "2026-11-07T09:14  52 msgs  1h 48m  the photo strip crops my pictures — the star trails lose the ridge",
  "2026-11-07T07:52  46 msgs   41m     the ask panel is one row short: the last option sits under the hint bar",
  "2026-11-06T22:31   9 msgs   12m     (untitled) 2026-11-06T22:31:00.000Z",
  "2026-11-06T21:05  78 msgs   3h 06m  (untitled) 2026-11-06T21:05:00.000Z",
  "2026-11-05T18:44   3 msgs    4m     (untitled) 2026-11-05T18:44:00.000Z",
].join("\n");

const HEAD_OF_SESSION = [
  "{",
  '  "type": "session",',
  '  "id": "019a4c1e-6b2d-7f31-9c02-81d5c2f9b410",',
  '  "cwd": "/home/knoopx/Projects/gpuix-apps/mu",',
  '  "timestamp": "2026-11-06T21:05:00.000Z",',
  '  "message": { "role": "user", "text": "the ring around the composer is drawn at 1x and measured at 2x" }',
  "}",
].join("\n");

export const SESSION_PICK_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-name-sessions",
    "three of the rows in the session list are untitled and i'm about to delete the wrong one. which is which, and why did they not get a label at all",
    0,
  ),
  ran(
    "c-ls-sessions",
    "bash",
    { command: "mu sessions --project . --format rows" },
    SESSION_ROWS,
    3_000,
  ),
  ran(
    "c-head-session",
    "read",
    { path: `~/.pi/agent/sessions/${SESSION_DIR}`, offset: 1, limit: 12 },
    HEAD_OF_SESSION,
    7_000,
  ),
  failed(
    "c-label-write",
    "edit",
    {
      path: "~/.pi/agent/sessions/--home-knoopx-Projects-gpuix-apps-mu--/index.json",
      edits: [
        { oldText: '"label": null', newText: '"label": "composer ring at 2x"' },
      ],
    },
    "Error: can't edit a session's own file — the label lives in the entry's header, which pi owns. Use `mu sessions --label`.",
    11_000,
  ),
  ran(
    "c-label",
    "bash",
    {
      command:
        "mu sessions --label 019a4c1e 'terminal: stty size disagrees with the panel'",
    },
    "labelled 019a4c1e → terminal: stty size disagrees with the panel\n2 of 5 rows still fall back to their opening line, which is what an untitled session prints",
    15_000,
  ),
  {
    ...answer(
      "a-name-sessions",
      [
        "A row's label is its own name when it has one, and otherwise **the first line of its opening message** — which is why two of yours read as dates: those sessions opened with a pasted image and no text, so there was no first line to take. Nothing is lost by that fallback, it is just unhelpful when you are choosing what to delete.",
        "",
        "The 3h 06m one is the composer-ring work, and it is worth keeping. The 4m one is a dead `ls`.",
      ].join("\n"),
      {
        reasoning:
          "The list is not the place to invent names — the label belongs to the session entry so it survives a resume. `--label` writes it there; editing the jsonl by hand would fight pi's own header and be lost on the next append.",
      },
    ),
    usage: usage(10_600, 1_440, 0, 1, 3),
  },
];
