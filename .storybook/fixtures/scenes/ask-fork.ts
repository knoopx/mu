import { normalizeQuestions } from "../../../src/plugins/interaction/lib/normalize";
import type {
  AskQuestion,
  AskRequest,
  AskUserDetails,
  AskUserParams,
} from "../../../src/plugins/interaction/types";
import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, ran, usage, userTurn } from "../turn";
import { toolCallFixture } from "../tool";

const RULES_DIR = "~/.config/mu/guardrails";

const RULE_FILES = [
  "package-manager.json      6 rules   bash            armed",
  "nix.json                  4 rules   bash            armed",
  "jj.json                   3 rules   bash            armed",
  "file-safety.json          5 rules   bash, python    armed",
  "legacy-python.json        2 rules   python          armed",
].join("\n");

const MIGRATION_QUESTIONS: AskQuestion[] = [
  {
    id: "legacy",
    question:
      "`legacy-python.json` has not blocked anything in nine weeks. Retire it, or keep it?",
    context: [
      `Rules live in ${RULES_DIR} and belong to you — mu writes none of them.`,
      "`legacy-python.json` holds two rules written before file sources existed, so they read command text only.",
      "`python.json` in the same folder already reads `content` and `newText`, and catches both of the old rules' cases.",
      "Coverage says: package-manager 14 blocks, nix 6, jj 3, file-safety 2, legacy-python 0.",
    ].join("\n"),
    options: [
      {
        label: "Delete the file (Recommended)",
        description:
          "its two cases are already covered by the file-domain rules, and a rule that cannot fire is a rule nobody can prove",
      },
      {
        label: "Rewrite the two rules to read file sources",
        description:
          "same coverage as today, one more file to keep, and nothing new gained",
      },
      {
        label: "Leave it armed",
        description:
          "costs nothing at runtime, but the suite stays unwritten and the coverage line stays at zero",
      },
    ],
    allowMultiple: false,
  },
  {
    id: "fixtures",
    question:
      "If I delete it, do its fixture cases move to `python.fixtures.json` first?",
    context: [
      "Every rule needs one `block-*` case and one `ok-*` case beside it, in `<domain>.fixtures.json`.",
      "The two old rules' cases are: `python -c 'print(1)'` must block, and `uv run script.py` must not.",
      "`python.json` has four cases and neither of those is among them.",
    ].join("\n"),
    options: [
      {
        label: "Move both cases over, then delete",
        description:
          "the false-positive case in particular is the one that keeps the surviving rule honest",
      },
      {
        label: "Drop them with the file",
        description:
          "nothing references them once the rules are gone, and the suite shrinks",
      },
    ],
    allowMultiple: false,
  },
];

export const ASK_FORK_QUESTIONS: AskQuestion[] = normalizeQuestions({
  questions: MIGRATION_QUESTIONS,
} satisfies AskUserParams);

export const ASK_FORK_ARGS = { questions: MIGRATION_QUESTIONS };

export const ASK_FORK_REQUESTS: AskRequest[] = ASK_FORK_QUESTIONS.map(
  (question, i) => ({
    runId: "ask-guardrails-retire",
    question,
    index: i + 1,
    total: ASK_FORK_QUESTIONS.length,
  }),
);

export const ASK_FORK_RUNNING: AskUserDetails = {
  answers: [],
  cancelled: false,
};

export const ASK_FORK_TOOL_ITEM: ReturnType<typeof toolCallFixture> =
  toolCallFixture("call-ask-fork", "ask-user", ASK_FORK_ARGS, "running", "", {
    details: ASK_FORK_RUNNING,
  });

export const ASK_FORK_ITEMS: TranscriptItem[] = [
    userTurn(
      "u-retire-rule",
      "go through my rule files and tell me which of them are earning their keep. if one is dead, say so before you touch it",
      0,
    ),
    ran(
      "c-rules-ls",
      "bash",
      { command: "mu guardrails --coverage --days 63" },
      RULE_FILES,
      4_000,
    ),
    ran(
      "c-read-legacy",
      "read",
      { path: `${RULES_DIR}/legacy-python.json` },
      [
        "{",
        '  "domain": "legacy-python",',
        '  "rules": [',
        "    {",
        '      "id": "python-eval",',
        '      "query": "(command (word) @c (#match? @c \\"^python -c\\"))",',
        '      "correction": "Use `uv run --with <dependency> <script.py>` or the python-eval tool."',
        "    }",
        "  ]",
        "}",
      ].join("\n"),
      8_000,
    ),
    ASK_FORK_TOOL_ITEM,
  ];

/** The turn that closes the fork, for a scene that shows the answer landed. */
export const ASK_FORK_ANSWER: TranscriptItem = {
  ...answer(
    "a-retire-rule",
    "Deleted, with both of its cases moved to `python.fixtures.json` first — so the surviving rule now has the false-positive case that the old file was the only place testing. Suite is green: 6 cases, 0 failures.",
    { reasoning: "A rule that cannot fire is not protection, it is a file someone has to read." },
  ),
  usage: usage(12_400, 1_320, 0, 3, 5),
};
