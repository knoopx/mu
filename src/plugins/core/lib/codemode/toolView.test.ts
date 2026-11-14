/**
 * The calls a script made, folded into lines.
 *
 * A script's calls never reach the model as tool calls, so the row is the only
 * place they are read: what the band has no room for is the *earliest* of them, each
 * line carries the state its mark has to paint, and the model bill is one line for
 * the whole run rather than a sum the reader has to make.
 */
import { describe, expect, test } from "bun:test";

import { codemodeViewOf } from "./toolView";
import type { ToolTranscriptItem } from "../agent/transcriptState";

const callOf = (index: number, cost: number | null = null) => ({
  name: `tool-${String(index)}`,
  args: "{}",
  status: "ok",
  durationMs: 10,
  cost,
  error: "",
});

const itemOf = (calls: unknown[]): ToolTranscriptItem =>
  ({
    type: "tool",
    id: "c",
    name: "codemode",
    status: "ok",
    output: "",
    args: { code: "text(1);" },
    details: { calls },
  }) as unknown as ToolTranscriptItem;

const ten = Array.from({ length: 10 }, (_, i) => callOf(i + 1));

describe("codemodeViewOf", () => {
  test("a short run answers with one line per call", () => {
    const view = codemodeViewOf(itemOf(ten.slice(0, 3)));
    expect(view.calls.map((call) => call.name)).toEqual([
      "tool-1",
      "tool-2",
      "tool-3",
    ]);
    expect(view.earlier).toBe(0);
    expect(view.calls[0]?.figures).toBe("10ms");
  });

  test("a long run keeps the calls it made last and says what it dropped", () => {
    const view = codemodeViewOf(itemOf(ten));
    expect(view.calls[0]?.name).toBe("tool-3");
    expect(view.calls.at(-1)?.name).toBe("tool-10");
    expect(view.earlier).toBe(2);
  });

  test("one priced call rides its own line, a bill of several is the block's", () => {
    const one = codemodeViewOf(itemOf([callOf(1, 0.01), callOf(2, null)]));
    expect(one.cost).toBe("");
    expect(one.calls[0]?.figures).toBe("10ms $0.01");

    const two = codemodeViewOf(itemOf([callOf(1, 0.01), callOf(2, 0.02)]));
    expect(two.cost).toBe("Model calls: $0.03");
  });

  test("a call that failed keeps its reason with the line that made it", () => {
    const view = codemodeViewOf(
      itemOf([
        { ...callOf(1), status: "error", error: "blocked(guardrails/uv)" },
      ]),
    );
    expect(view.calls[0]?.status).toBe("error");
    expect(view.calls[0]?.error).toBe("blocked(guardrails/uv)");
  });
});
