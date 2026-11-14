/**
 * The guardrails tools' own answers, as their `details` write them.
 *
 * A coverage scan, a suite run and a fixture write are three different answers,
 * but the log reads all three the same way: the header states what the call was
 * pointed at and what it counted, the chips carry the figures it ran with, and
 * the card holds only its rows. These fixtures are the evidence those claims
 * are checked against — 32 domains is a wall, so a scan's subset is seven, with
 * a never-fired row, a fired one and a legacy name among them.
 */

import { homedir } from "node:os";
import { join } from "node:path";

import {
  GUARDRAILS_COVERAGE_TOOL,
  GUARDRAILS_FIXTURE_TOOL,
  GUARDRAILS_TEST_TOOL,
} from "../../src/plugins/guardrails/constants";
import type {
  GuardrailsCoverageDetails,
  GuardrailsFixtureUpdateDetails,
  GuardrailsTestDetails,
} from "../../src/plugins/guardrails/types";
import { toolCallFixture, type ToolFixture } from "./tool";

/** The session store as the tool found it, spelled from the real home folder so
 *  the header can answer with `~` the way the app does. */
export const SESSIONS_STORE = join(homedir(), ".pi", "agent", "sessions");

/** In the order the scan answers: hits first, the quiet tail named. */
const COVERAGE_ROWS = [
  { domain: "uv", blocks: 91, last: "10m", never: false },
  { domain: "trash-deletion", blocks: 83, last: "28m", never: false },
  { domain: "jj", blocks: 53, last: "54m", never: false },
  { domain: "search-flags", blocks: 31, last: "2h", never: false },
  { domain: "nix", blocks: 16, last: "3d", never: false },
  { domain: "package-manager", blocks: 3, last: "16h", never: false },
  { domain: "container-runtime", blocks: 0, last: "", never: true },
  { domain: "python", blocks: 0, last: "", never: true },
  { domain: "typescript", blocks: 0, last: "", never: true },
];

const COVERAGE_DETAILS: GuardrailsCoverageDetails = {
  status: "ok",
  dir: SESSIONS_STORE,
  error: "",
  files: 1201,
  windowDays: 0,
  ruleCount: 237,
  truncated: false,
  note: "",
  rows: COVERAGE_ROWS,
};

export const GUARDRAILS_COVERAGE_ITEM: ToolFixture = toolCallFixture(
  "call-guardrails-coverage",
  GUARDRAILS_COVERAGE_TOOL,
  { days: 0 },
  "ok",
  [
    `guardrails-coverage · ${SESSIONS_STORE} · every session · 1201 files`,
    "never triggered: container-runtime, python, typescript",
    COVERAGE_ROWS.map((row) => row.domain).join("\n"),
  ].join("\n\n"),
  { details: COVERAGE_DETAILS },
);

const TEST_ROWS: GuardrailsTestDetails["rows"] = [
  {
    domain: "package-manager",
    id: "block-npm-i",
    command: "npm i zod",
    field: "command",
    want: true,
    got: true,
    status: "PASS",
    detail: "",
  },
  {
    domain: "package-manager",
    id: "ok-bun-add",
    command: "bun add zod",
    field: "command",
    want: false,
    got: false,
    status: "PASS",
    detail: "",
  },
  {
    domain: "package-manager",
    id: "block-npm-global",
    command: "bun add -g eslint",
    field: "command",
    want: true,
    got: false,
    status: "FAIL",
    detail: "wanted a block, the engine released it",
  },
  {
    domain: "package-manager",
    id: "ok-bunx",
    command: "bunx prisma generate",
    field: "command",
    want: false,
    got: false,
    status: "PASS",
    detail: "",
  },
  {
    domain: "python",
    id: "block-pip-install",
    command: "pip install requests",
    field: "command",
    want: true,
    got: true,
    status: "PASS",
    detail: "",
  },
  {
    domain: "python",
    id: "ok-python-eval",
    command: "python-eval print(1)",
    field: "command",
    want: false,
    got: false,
    status: "PASS",
    detail: "",
  },
];

const TEST_DETAILS: GuardrailsTestDetails = {
  status: "ok",
  dir: "~/.config/mu/guardrails",
  domain: null,
  fixture: null,
  suites: ["package-manager", "python"],
  engine: { phase: "ready", bootMs: 6, grammars: ["bash", "python"] },
  note: "disarmed in this run: python — the suite proves the rule, not the arming",
  pass: 5,
  fail: 1,
  total: 6,
  rows: TEST_ROWS,
};

export const GUARDRAILS_TEST_ITEM: ToolFixture = toolCallFixture(
  "call-guardrails-test",
  GUARDRAILS_TEST_TOOL,
  {},
  "ok",
  [
    "guardrails-test · suites package-manager, python · parser ready in 6ms",
    "domain  fixture  field  want  got  status  detail",
    "pass=5 fail=1 total=6",
  ].join("\n\n"),
  { details: TEST_DETAILS },
);

const FIXTURE_WRITE_DETAILS: GuardrailsFixtureUpdateDetails = {
  status: "ok",
  dir: "~/.config/mu/guardrails",
  domain: "package-manager",
  path: join(
    homedir(),
    ".config",
    "mu",
    "guardrails",
    "package-manager.fixtures.json",
  ),
  note: "",
  before: 3,
  ops: [
    { op: "write", id: "block-npm-i", status: "ok", detail: "updated" },
    { op: "write", id: "block-npm-run", status: "ok", detail: "added" },
    { op: "delete", id: "ok-stale-shape", status: "ok", detail: "" },
  ],
  written: 2,
  deleted: 1,
  failed: 0,
};

export const GUARDRAILS_FIXTURE_ITEM: ToolFixture = toolCallFixture(
  "call-guardrails-fixture-write",
  GUARDRAILS_FIXTURE_TOOL,
  { domain: "package-manager" },
  "ok",
  [
    "guardrails-fixture-update · package-manager · 3 fixtures before",
    "op  id  status  detail",
    "written=2 deleted=1 failed=0 file=package-manager.fixtures.json",
  ].join("\n\n"),
  { details: FIXTURE_WRITE_DETAILS },
);
