import type {
  AgentToolResult,
  ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

import { GUARDRAILS_FIXTURE_TOOL, MAX_FIXTURES_PER_WRITE } from "../constants";
import {
  deleteFixtures,
  fixtureSuiteFor,
  fixturesDirLabel,
  upsertFixtures,
} from "../lib/fixtures";
import { ensureFixturesDir } from "../lib/rulesFile";
import { reportSummary, reportTable } from "../lib/report";
import type {
  GuardrailFixture,
  GuardrailsFixtureUpdateDetails,
} from "../types";

const nonEmptyString = (description: string) =>
  Type.String({ minLength: 1, pattern: "^\\s*\\S", description });

const FixtureEventSchema = Type.Object(
  {
    type: Type.Optional(
      Type.String({
        description: "Event type; `tool_call` is written when omitted",
      }),
    ),
    toolName: Type.Optional(
      Type.String({
        description: "Tool the call is made to — `bash` when omitted",
      }),
    ),
    toolCallId: Type.Optional(
      Type.String({ description: "Optional id for the call under test" }),
    ),
    input: Type.Optional(
      Type.Record(Type.String(), Type.Unknown(), {
        description:
          'Tool input, e.g. `{"command": "npm i zod"}`. A guarded command tool needs `command`',
      }),
    ),
  },
  { additionalProperties: true },
);

const FixtureExpectedSchema = Type.Object(
  {
    block: Type.Boolean({
      description:
        "true — the call must be blocked; false — it must be released",
    }),
    reason_contains: Type.Optional(
      Type.String({
        description:
          "Text the block reason handed to the model must contain (only checked on a block)",
      }),
    ),
    note: Type.Optional(
      Type.String({
        description: "Why the case exists, for the human reading the suite",
      }),
    ),
  },
  { additionalProperties: true },
);

const FixtureSchema = Type.Object(
  {
    id: nonEmptyString(
      "Unique kebab-case id inside the suite: `block-*` for a true positive, `ok-*` for a false positive",
    ),
    event: FixtureEventSchema,
    expected: FixtureExpectedSchema,
    domain: Type.Optional(
      Type.String({
        description:
          "Domain label written into the record (`bash` when omitted)",
      }),
    ),
  },
  { additionalProperties: true },
);

const FixtureUpdateParametersSchema = Type.Object({
  domain: nonEmptyString(
    "Suite to write, named by its domain (e.g. `package-manager`); the file is `<domain>.fixtures.json`, beside the `<domain>.json` rules it proves",
  ),
  fixtures: Type.Optional(
    Type.Array(FixtureSchema, {
      maxItems: MAX_FIXTURES_PER_WRITE,
      description:
        "Fixture records to upsert: an existing id is replaced in place, a new id is appended",
    }),
  ),
  delete: Type.Optional(
    Type.Array(nonEmptyString("Fixture id to remove"), {
      description: 'Ids to delete from the suite (e.g. `["ok-stale-shape"]`)',
    }),
  ),
});

/** The record as it lands on disk: the pi fixture shape, defaults written out. */
const normalize = (
  fixture: GuardrailFixture,
  domain: string,
): GuardrailFixture => ({
  ...fixture,
  domain: fixture.domain ?? domain,
  event: { ...fixture.event, type: fixture.event.type ?? "tool_call" },
});

export function updateGuardrailFixtures(
  dir: string | null,
  domain: string,
  fixtures: readonly GuardrailFixture[] = [],
  ids: readonly string[] = [],
): AgentToolResult<GuardrailsFixtureUpdateDetails> {
  if (dir === null)
    return {
      content: [
        {
          type: "text",
          text:
            `guardrails-fixture-update: no suite directory at ${fixturesDirLabel()}.\n` +
            "Suites are `<domain>.fixtures.json` beside the `<domain>.json` rules they prove, in mu's\n" +
            "own guardrails directory under the user's config; MU_GUARDRAILS_FIXTURES points it elsewhere.",
        },
      ],
      details: {
        dir: null,
        domain,
        path: "",
        before: -1,
        ops: [],
        written: 0,
        deleted: 0,
        failed: fixtures.length + ids.length,
      },
    };

  const path = `${dir}/${domain}.json`;
  const existing = fixtureSuiteFor(dir, domain);
  const writes = upsertFixtures(
    dir,
    domain,
    fixtures.map((fixture) => normalize(fixture, domain)),
  );
  const deletes = ids.length === 0 ? [] : deleteFixtures(dir, domain, ids);
  const ops = [...writes, ...deletes];
  const written = writes.filter((entry) => entry.status === "ok").length;
  const deleted = deletes.filter((entry) => entry.status === "ok").length;
  const failed = ops.filter((entry) => entry.status === "fail").length;

  const text = [
    `guardrails-fixture-update · ${domain} · ${
      existing === null
        ? "new suite"
        : `${existing.fixtures.length} fixtures before`
    }`,
    reportTable(
      ["op", "id", "status", "detail"],
      ops.map((entry) => [entry.op, entry.id, entry.status, entry.detail]),
    ),
    reportSummary([
      ["written", written],
      ["deleted", deleted],
      ["failed", failed],
      ["file", path],
    ]),
  ]
    .filter((block) => block !== "")
    .join("\n\n");

  return {
    content: [{ type: "text", text }],
    details: {
      dir,
      domain,
      path,
      before: existing === null ? -1 : existing.fixtures.length,
      ops,
      written,
      deleted,
      failed,
    },
  };
}

export const guardrailsFixtureUpdateTool: ToolDefinition<
  typeof FixtureUpdateParametersSchema,
  GuardrailsFixtureUpdateDetails
> = {
  name: GUARDRAILS_FIXTURE_TOOL,
  label: "guardrails fixture update",
  description:
    "Creates, updates and deletes guardrails fixtures in a suite (`<domain>.fixtures.json`, beside the rules). " +
    "Each record is a tool call and the verdict it deserves: `id` (kebab-case, `block-*` for a true " +
    "positive, `ok-*` for a false positive), `event` (the tool_call under test) and `expected` " +
    "(`block`, optional `reason_contains`, optional `note`). Upsert by id and delete in one pass. " +
    "Use it when a rule changes and the suite must grow with it, or when a case no longer reflects the rule.",
  promptSnippet:
    "Add, update or delete guardrails fixtures in a domain's suite",
  promptGuidelines: [
    "Write one block-* and one ok-* fixture for every guardrails rule you add or change, then run guardrails-test on that domain.",
    "Keep ids stable — a fixture id is what a suite run and a git diff name, so update in place rather than deleting and re-adding.",
    "`reason_contains` pins the reason text the model reads; pin it when the correction wording is the point of the rule.",
  ],

  executionMode: "sequential",
  parameters: FixtureUpdateParametersSchema,

  async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
    return updateGuardrailFixtures(
      ensureFixturesDir(),
      params.domain,
      params.fixtures ?? [],
      params.delete ?? [],
    );
  },
};
