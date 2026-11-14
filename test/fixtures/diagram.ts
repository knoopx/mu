import { MERMAID_RENDER_TOOL } from "../../src/plugins/mermaid/constants";
import {
  diagramAnswerOf,
  diagramFailureAnswer,
} from "../../src/plugins/mermaid/lib/answer";
import { renderDiagram } from "../../src/plugins/mermaid/lib/diagram";
import { toolCallFixture, type ToolFixture } from "./tool";

/** The source a model would write for "how do the parts fit together". */
export const DIAGRAM_SOURCE = [
  "flowchart LR",
  '  subgraph pi["pi — the agent core"]',
  "    session[AgentSession]",
  "    tools[Tool definitions]",
  "  end",
  '  subgraph mu["mu — this window"]',
  "    transcript[Transcript rows]",
  "    composer[Composer]",
  "    store[Session tree]",
  "  end",
  "  composer -->|prompt| session",
  "  session -->|messages| transcript",
  "  session -->|calls| tools",
  "  tools -->|results| store",
  "  store -->|history| transcript",
].join("\n");

const picture = renderDiagram(DIAGRAM_SOURCE);
picture.written = "docs/architecture.svg";

/** A diagram that drew, and the file it was saved to. */
export const DIAGRAM_ITEM: ToolFixture = toolCallFixture(
  "call-diagram",
  MERMAID_RENDER_TOOL,
  { source: DIAGRAM_SOURCE, path: "docs/architecture.svg" },
  "ok",
  diagramAnswerOf(picture),
  { details: picture },
);

/** The same call one colon short: the parser names the line it stopped on. */
const BROKEN_SOURCE = [
  "sequenceDiagram",
  "  Agent->>Session: run the call",
  "  Session-->>Agent done",
].join("\n");

const broken = renderDiagram(BROKEN_SOURCE);

export const DIAGRAM_FAILED_ITEM: ToolFixture = toolCallFixture(
  "call-diagram-broken",
  MERMAID_RENDER_TOOL,
  { source: BROKEN_SOURCE },
  "error",
  diagramFailureAnswer(broken),
  { details: broken },
);

export const DIAGRAM_ANSWER =
  "The left side is pi: the session and the tool definitions mu registers into it. The right side is this window — the composer sends, the session answers, and the session tree is what makes an old conversation clickable again. The picture is also saved to `docs/architecture.svg`, so it can be committed next to the README";
