import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  COMMAND_INPUT_KEYS,
  FILE_TEXT_INPUT_KEYS,
  FIXTURES_FILE_SUFFIX,
  GUARDED_COMMAND_TOOLS,
  GUARDED_FILE_TOOLS,
  PATH_INPUT_KEYS,
} from "../constants";
import type {
  GuardrailFixture,
  GuardrailFixtureOp,
  GuardrailFixtureSuite,
} from "../types";
import { blockReasonOf, evaluateToolCall } from "./engine";
import { guardrailRules } from "./rules";
import {
  fixturesDir,
  fixturesDirDisplay,
  suiteDomainOf,
  suiteFilesIn,
  writeJsonArray,
} from "./rulesFile";

export const fixtureToolOf = (fixture: GuardrailFixture): string =>
  fixture.event.toolName ?? "bash";

const fixtureKeyOf = (fixture: GuardrailFixture): string => {
  const input = fixture.event.input ?? {};
  const tool = fixtureToolOf(fixture);
  const keys = GUARDED_FILE_TOOLS.includes(tool)
    ? FILE_TEXT_INPUT_KEYS
    : COMMAND_INPUT_KEYS;
  for (const key of keys) {
    const value = input[key];
    if (typeof value === "string" && value.trim() !== "") return key;
  }
  return keys[0] ?? "command";
};

export const fixtureSubjectOf = (fixture: GuardrailFixture): string => {
  const value = (fixture.event.input ?? {})[fixtureKeyOf(fixture)];
  return typeof value === "string" ? (value.split("\n")[0] ?? "") : "";
};

export const fixtureFieldOf = (fixture: GuardrailFixture): string =>
  fixtureKeyOf(fixture);

export function fixtureShapeError(fixture: GuardrailFixture): string {
  if (fixture.id.trim() === "") return "fixture id is empty";
  if (fixture.expected === undefined)
    return `fixture ${fixture.id} has no expected`;
  if (typeof fixture.expected.block !== "boolean")
    return `fixture ${fixture.id} needs expected.block to be true or false`;
  const tool = fixtureToolOf(fixture);
  const input = fixture.event.input ?? {};
  if (GUARDED_COMMAND_TOOLS.includes(tool)) {
    const command = input["command"] ?? input["cmd"];
    if (typeof command !== "string")
      return `fixture ${fixture.id} is a ${tool} call with no input.command`;
    return "";
  }
  if (GUARDED_FILE_TOOLS.includes(tool)) {
    const path = PATH_INPUT_KEYS.map((key) => input[key]).find(
      (value) => typeof value === "string" && value.trim() !== "",
    );
    if (path === undefined)
      return `fixture ${fixture.id} is a ${tool} call with no input.path — the path names the grammar`;
    const text = FILE_TEXT_INPUT_KEYS.map((key) => input[key]).find(
      (value) => typeof value === "string" && value.trim() !== "",
    );
    if (text === undefined)
      return `fixture ${fixture.id} is a ${tool} call with no ${FILE_TEXT_INPUT_KEYS.join("/")} text`;
    return "";
  }
  return "";
}

export function fixturesDirFor(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const dir = fixturesDir(env);
  return existsSync(dir) ? dir : null;
}

export const fixturesDirLabel = (
  env: NodeJS.ProcessEnv = process.env,
): string => fixturesDirDisplay(env);

const suiteFileIn = (dir: string, domain: string): string =>
  join(dir, `${domain}${FIXTURES_FILE_SUFFIX}`);

const parseSuite = (path: string, domain: string): GuardrailFixtureSuite => {
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch (cause) {
    return { domain, path, fixtures: [], error: String(cause) };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (cause) {
    return {
      domain,
      path,
      fixtures: [],
      error: `not valid JSON: ${String(cause)}`,
    };
  }
  if (!Array.isArray(parsed))
    return {
      domain,
      path,
      fixtures: [],
      error: "fixtures.json must hold an array",
    };
  const fixtures = parsed.filter(
    (fixture): fixture is GuardrailFixture =>
      typeof fixture === "object" && fixture !== null && "event" in fixture,
  );
  const dropped = parsed.length - fixtures.length;
  return {
    domain,
    path,
    fixtures,
    ...(dropped > 0
      ? {
          error: `${dropped} ${dropped === 1 ? "entry" : "entries"} ignored for having no event`,
        }
      : {}),
  };
};

export function fixtureSuites(dir: string): GuardrailFixtureSuite[] {
  return suiteFilesIn(dir).map((file) =>
    parseSuite(join(dir, file), suiteDomainOf(file)),
  );
}

export const fixtureSuiteFor = (
  dir: string,
  domain: string,
): GuardrailFixtureSuite | null => {
  const path = suiteFileIn(dir, domain);
  return existsSync(path) ? parseSuite(path, domain) : null;
};

const writeSuite = (
  path: string,
  fixtures: readonly GuardrailFixture[],
): void => writeJsonArray(path, fixtures);

/**
 * One rewrite of a suite: when it throws, every op that had succeeded becomes a
 * failure naming the cause, so a caller never reports a write that did not land.
 */
const commitSuite = (
  path: string,
  next: readonly GuardrailFixture[],
  out: readonly GuardrailFixtureOp[],
): GuardrailFixtureOp[] => {
  try {
    writeSuite(path, next);
  } catch (cause) {
    return out.map((entry) =>
      entry.status === "ok"
        ? op(entry.op, entry.id, "fail", String(cause))
        : entry,
    );
  }
  return [...out];
};

const op = (
  kind: GuardrailFixtureOp["op"],
  id: string,
  status: "ok" | "fail",
  detail = "",
): GuardrailFixtureOp => ({ op: kind, id, status, detail });

export function upsertFixtures(
  dir: string,
  domain: string,
  fixtures: readonly GuardrailFixture[],
): GuardrailFixtureOp[] {
  const suite = fixtureSuiteFor(dir, domain);
  const path = suiteFileIn(dir, domain);
  const kept = suite?.fixtures ?? [];
  if (suite !== null && suite.error !== undefined)
    return [op("write", domain, "fail", `suite unreadable: ${suite.error}`)];
  const out: GuardrailFixtureOp[] = [];
  const next = [...kept];
  for (const fixture of fixtures) {
    const shape = fixtureShapeError(fixture);
    if (shape !== "") {
      out.push(op("write", fixture.id ?? "?", "fail", shape));
      continue;
    }
    const at = next.findIndex((candidate) => candidate.id === fixture.id);
    if (at === -1) next.push(fixture);
    else next[at] = fixture;
    out.push(op("write", fixture.id, "ok", at === -1 ? "added" : "updated"));
  }
  const written = out.filter((entry) => entry.status === "ok").length;
  if (written === 0) return out;
  return commitSuite(path, next, out);
}

export function deleteFixtures(
  dir: string,
  domain: string,
  ids: readonly string[],
): GuardrailFixtureOp[] {
  const suite = fixtureSuiteFor(dir, domain);
  if (suite === null)
    return ids.map((id) => op("delete", id, "fail", `no suite for ${domain}`));
  if (suite.error !== undefined)
    return [op("delete", domain, "fail", `suite unreadable: ${suite.error}`)];
  const path = suite.path;
  const out: GuardrailFixtureOp[] = [];
  const next = [...suite.fixtures];
  for (const id of ids) {
    const at = next.findIndex((fixture) => fixture.id === id);
    if (at === -1) {
      out.push(op("delete", id, "fail", "no fixture with that id"));
      continue;
    }
    next.splice(at, 1);
    out.push(op("delete", id, "ok"));
  }
  if (out.some((entry) => entry.status === "ok"))
    return commitSuite(path, next, out);
  return out;
}

export interface GuardrailFixtureResult {
  domain: string;
  id: string;
  want: boolean;
  got: boolean;
  status: "PASS" | "FAIL";
  detail: string;
  engineMs: number;
  command: string;
  field: string;
}

export async function runFixture(
  fixture: GuardrailFixture,
): Promise<GuardrailFixtureResult> {
  const domain = fixture.domain ?? "bash";
  const field = fixtureFieldOf(fixture);
  const command = fixtureSubjectOf(fixture);
  const shape = fixtureShapeError(fixture);
  if (shape !== "")
    return {
      domain,
      id: fixture.id,
      want: fixture.expected.block,
      got: false,
      status: "FAIL",
      detail: shape,
      engineMs: 0,
      command,
      field,
    };
  const outcome = await evaluateToolCall({
    toolName: fixtureToolOf(fixture),
    toolCallId: fixture.event.toolCallId ?? fixture.id,
    input: fixture.event.input ?? {},
  });
  const primary = outcome.primary;
  const got = primary !== null;
  if (got !== fixture.expected.block)
    return {
      domain,
      id: fixture.id,
      want: fixture.expected.block,
      got,
      status: "FAIL",
      detail: got
        ? `blocked by ${primary?.ruleId ?? "?"} — the suite wants it released`
        : `released by ${outcome.skip ?? "no rule"} — the suite wants it blocked`,
      engineMs: outcome.engineMs,
      command,
      field,
    };
  const wants = fixture.expected.reason_contains;
  if (wants !== undefined && got && primary !== null) {
    const reason = blockReasonOf(primary);
    if (!reason.includes(wants))
      return {
        domain,
        id: fixture.id,
        want: fixture.expected.block,
        got,
        status: "FAIL",
        detail: `reason lacks "${wants}"`,
        engineMs: outcome.engineMs,
        command,
        field,
      };
  }
  return {
    domain,
    id: fixture.id,
    want: fixture.expected.block,
    got,
    status: "PASS",
    detail: "",
    engineMs: outcome.engineMs,
    command,
    field,
  };
}

export const ruledDomains = (): string[] => [
  ...new Set(guardrailRules().map((rule) => rule.domain)),
];
