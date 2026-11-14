import type { TranscriptItem } from "../../src/plugins/core/lib/agent/transcriptState";

export type ToolFixture = Extract<TranscriptItem, { kind: "tool" }>;

export const toolCallFixture = (
  id: string,
  name: string,
  args: Record<string, unknown> = {},
  status: ToolFixture["status"] = "ok",
  output = "",
  extra?: Partial<ToolFixture>,
): ToolFixture => ({
  kind: "tool",
  id,
  toolCallId: id,
  name,
  args,
  status,
  output,
  ...extra,
});
