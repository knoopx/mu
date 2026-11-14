/**
 * The codemode row, painted the way pi's terminal paints it: the script, a blank
 * line, one line per call it made, a blank line, what it printed, and the time it
 * took.
 *
 * Three cards and nothing else, in pi's order: what was asked, what it called, what
 * it printed. Each stands on its own plate, so the boundary a reader wants — where
 * the source stops and the calls begin — is drawn rather than inferred from a blank
 * line, and each card is told apart by its shape rather than by a heading over it: a
 * script is syntax coloured, a call is one line wearing the mark of how it ended,
 * printed text is the log's output ink. The script is the part a row cannot invent: the calls
 * and the printed text are the answer, but what a script *does* lives in its
 * source, and it is the one thing a codemode call says nowhere else. The nested
 * calls are painted here rather than as rows of their own because they never reach
 * the model as tool calls: the transcript keeps them on this one item.
 */

import {
  Icon,
  OutputBox,
  T,
  useAdwaita,
  type AdwaitaTheme,
  type IconName,
} from "adwaita-gpuix";
import type { JSX } from "react";
import type { StyleDesc } from "@gpuix/react";

import type { ToolTranscriptItem } from "../lib/agent/transcriptState";
import { ToolBand } from "./ToolBand";
import { ToolCaptionLine } from "./ToolCaptionLine";
import type { CodemodeCallLine, CodemodeView } from "../lib/codemode/toolView";
import {
  MAX_SCRIPT_OUTPUT_LINES,
  codemodeAnswerOf,
  codemodeBlockOf,
  codemodeOmittedOf,
  codemodeTookOf,
} from "../lib/codemode/answer";
import { codemodeViewOf } from "../lib/codemode/toolView";
import {
  CODEMODE_TOOL,
  MAX_SCRIPT_LINES,
  codemodeScriptOf,
} from "../lib/codemode/script";
import { buildNativeTheme, mutedText } from "../lib/ui/theme";
import { previewLineHeight } from "../lib/ui/transcriptLayout";
import { emphasisWeight, glyphForText, monoTextWidth } from "../lib/ui/tokens";
import {
  toolBodyStack,
  toolToneColor,
  type ToolRowTone,
} from "../lib/ui/toolRowPaint";
import { toolColumn, toolEllipsis, toolText } from "../lib/ui/toolRows";

export function isCodemodeTool(name: string): boolean {
  return name.toLowerCase() === CODEMODE_TOOL;
}

/**
 * How a call ended, in the mark pi puts at the head of its line: a run still in
 * flight is an ellipsis, a finished one a tick, a failed one a cross, a cancelled
 * one a barred circle. A row in the log has no state to strike, so unlike every
 * other tool row this one says it on every line.
 */
const CALL_MARKS: Readonly<
  Record<
    CodemodeCallLine["status"],
    { glyph?: string; icon?: IconName; tone: ToolRowTone }
  >
> = {
  running: { glyph: "…", tone: "warn" },
  ok: { icon: "check", tone: "ok" },
  error: { icon: "close", tone: "bad" },
  cancelled: { icon: "cancel", tone: "neutral" },
};

export interface CodemodeToolRowsProps {
  item: ToolTranscriptItem;
}

/**
 * The language the script is painted in. A codemode script runs in QuickJS and
 * never touches a disk, so this name is the highlighter's hint and nothing more:
 * the native `<code>` element reads a language off the name it is given and asks
 * for no file.
 */
const SCRIPT_LANGUAGE = "codemode.js";

/** The script's own source, standing bare on the band the way a read's text does. */
function ScriptSource({ code }: { code: string }): JSX.Element {
  const t = useAdwaita();
  const lineHeight = previewLineHeight(t);

  return (
    <code
      code={code}
      path={SCRIPT_LANGUAGE}
      theme={buildNativeTheme(t)}
      style={{
        maxHeight: MAX_SCRIPT_LINES * lineHeight,
        overflow: "hidden",
        flexShrink: 0,
        minWidth: 0,
        fontFamily: t.type.fontFamilyMono,
        fontSize: t.type.caption,
        lineHeight,
        color: t.color.text.primary,
      }}
    />
  );
}

/** The mark that opens a call's line, in a column wide enough for the widest of them. */
function CallMark({
  status,
}: {
  status: CodemodeCallLine["status"];
}): JSX.Element {
  const t = useAdwaita();
  const mark = CALL_MARKS[status];
  const color = toolToneColor(t, mark.tone);

  return (
    <div style={callMark(t)}>
      {mark.glyph === undefined ? (
        <Icon
          name={mark.icon ?? "check"}
          size={glyphForText(t.type.caption)}
          color={color}
        />
      ) : (
        <T
          size="caption"
          color={color}
          style={{ fontFamily: t.type.fontFamilyMono, lineHeight: 1 }}
        >
          {mark.glyph}
        </T>
      )}
    </div>
  );
}

/** One call: its mark, the tool it called, the arguments it passed, how long it ran and what it cost. */
function CallLine({ call }: { call: CodemodeCallLine }): JSX.Element {
  const t = useAdwaita();

  return (
    <>
      <div style={callLine(t)}>
        <CallMark status={call.status} />
        <T
          size="caption"
          color={t.color.text.primary}
          weight={emphasisWeight(t)}
          style={{ fontFamily: t.type.fontFamilyMono, flexShrink: 0 }}
        >
          {call.name}
        </T>
        {call.args === "" ? null : (
          <T
            size="caption"
            color={mutedText(t)}
            style={{
              fontFamily: t.type.fontFamilyMono,
              flexShrink: 1,
              minWidth: 0,
              ...toolEllipsis,
            }}
          >
            {call.args}
          </T>
        )}
        {call.figures === "" ? null : (
          <T
            size="caption"
            color={mutedText(t)}
            style={{ fontFamily: t.type.fontFamilyMono, flexShrink: 0 }}
          >
            {call.figures}
          </T>
        )}
      </div>
      {call.error === "" ? null : (
        <T
          size="caption"
          color={toolToneColor(t, "bad")}
          style={{ ...callError(t), ...toolEllipsis }}
        >
          {call.error}
        </T>
      )}
    </>
  );
}

/** What a block left out, in pi's own parentheses, under the block rather than inside it. */
function Omitted({
  count,
  words,
}: {
  count: number;
  words: string;
}): JSX.Element | null {
  const t = useAdwaita();
  const text = codemodeOmittedOf(count, words);
  if (text === "") return null;
  return <ToolCaptionLine color={mutedText(t)} text={text} />;
}

/** A muted line of the row's own commentary: what fell off, the model bill, the time it took. */
function QuietLine({ text }: { text: string }): JSX.Element | null {
  const t = useAdwaita();
  if (text === "") return null;
  return <ToolCaptionLine color={mutedText(t)} text={text} />;
}

export function CodemodeToolRows({ item }: CodemodeToolRowsProps): JSX.Element {
  const t = useAdwaita();
  const answer = codemodeAnswerOf(item.output);
  const view: CodemodeView = codemodeViewOf(item);
  const script = codemodeBlockOf(codemodeScriptOf(item), MAX_SCRIPT_LINES);
  /** A script answers with its point first, so the budget keeps the head of it. */
  const output = codemodeBlockOf(answer.body, MAX_SCRIPT_OUTPUT_LINES);
  const took = codemodeTookOf(answer.tookMs);

  const hasScript = script.text.trim() !== "";
  const hasCalls = view.calls.length > 0;
  const hasOutput = output.text !== "";

  /**
   * The three cards, in pi's order, each one shape and nothing else.
   *
   * The script is the input, the calls are what it asked for, the plates are what
   * it printed: three cards, because a run that reads as one wall of text hides
   * which of its lines were written by the model and which came back from a tool.
   * How long the run took stays off the cards — it is a figure about the call, not
   * another line of what the call printed — and stands in the log's column under
   * them, where pi prints it too.
   */
  const blocks: JSX.Element[] = [];
  if (hasScript)
    blocks.push(
      <div key="script" style={toolBodyStack(t)}>
        <ScriptSource code={script.text} />
        <Omitted count={script.omitted} words="more lines" />
      </div>,
    );
  if (hasCalls)
    blocks.push(
      // The lines stand flush: each call is one line, and air between them would
      // read as one call spread over two.
      <div key="calls" style={toolColumn(t)}>
        <Omitted count={view.earlier} words="earlier calls" />
        {view.calls.map((call, index) => (
          <CallLine key={`${call.name}-${String(index)}`} call={call} />
        ))}
        <QuietLine text={view.cost} />
      </div>,
    );
  if (hasOutput)
    blocks.push(
      <div key="output" style={toolBodyStack(t)}>
        {
          // The text a script printed is an answer like any other and stands on
          // the band, not in a second plate. Only a failure keeps a plate,
          // because the tint is the point of it.
          <OutputBox
            text={output.text}
            tone={item.status === "error" ? "error" : "default"}
            padding={0}
            style={
              item.status === "error"
                ? undefined
                : { backgroundColor: "transparent" }
            }
          />
        }
        <Omitted count={output.omitted} words="more lines" />
        <QuietLine
          text={
            view.fullOutputPath === ""
              ? ""
              : `Full output: ${view.fullOutputPath}`
          }
        />
      </div>,
    );

  // Each block gets its own plate; the air between plates is the log's own card
  // gap, the same measure that divides the sections of a GitHub card.
  return (
    <div style={toolBodyStack(t)}>
      {blocks.map((block, index) => (
        <ToolBand key={String(block.key)} style={cardBand(t, index === 0)}>
          {block}
        </ToolBand>
      ))}
      <QuietLine text={took} />
    </div>
  );
}

/** A card of the row: the log's plate, and the gap that divides it from the one above. */
const cardBand = (t: AdwaitaTheme, first: boolean): Partial<StyleDesc> => ({
  flexShrink: 0,
  marginTop: first ? 0 : t.space.sm,
});

/* The measure of one call line ------------------------------------------ */

/** The column the marks of a call list stand in, so the names line up down the block. */
const callMark = (t: AdwaitaTheme): StyleDesc => ({
  width: glyphForText(t.type.caption) + t.space.xs,
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  flexShrink: 0,
  pointerEvents: "none",
});

/** One line of a call list: as tight as a line of text and no taller. */
const callLine = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: t.space.xs,
  minHeight: previewLineHeight(t),
  minWidth: 0,
  flexShrink: 0,
  ...toolText(t),
});

/** A call's failure, indented to the names above it the way pi indents it: four spaces. */
const callError = (t: AdwaitaTheme): StyleDesc => ({
  ...toolText(t),
  paddingLeft: monoTextWidth(t, 4),
  minHeight: previewLineHeight(t),
  fontFamily: t.type.fontFamilyMono,
  flexShrink: 0,
  minWidth: 0,
});
