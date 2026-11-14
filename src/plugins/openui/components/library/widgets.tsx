/**
 * The widget area of the language: small self-contained things a screen hands the
 * human to use — a clock, a quiz, a set of cards, a guided walk.
 *
 * These are the components the reference plugin added for teaching and for
 * watching something run, and they are the ones that hold their own state on the
 * page: a quiz's answers, a card that has been turned over, the step of a
 * walkthrough the reader stands at. None of them asks the agent anything — the
 * agent sees a screen like this one through `openui-state`, and a quiz that
 * needed a model call per question would not be a quiz.
 */

import { useEffect, useState, type JSX } from "react";
import { defineComponent, type ElementNode } from "@openuidev/lang-core";
import {
  Button as AdwaitaButton,
  Icon as AdwaitaIcon,
  ProgressBar,
  T,
} from "adwaita-gpuix";

import { z } from "zod/v4";

import { HAIRLINE, INLINE_GLYPH } from "../../../core/lib/ui/tokens";
import { mutedText } from "../../../core/lib/ui/theme";
import { innerGap, programEmphasisWeight, programTitleWeight } from "../../lib/tokens";
import { programProgressTone, programTextColor } from "../../lib/theme";
import type { ProgramContext } from "./context";
import {
  listProp,
  programColumnStyle,
  programRowStyle,
  prop,
  textProp,
} from "./context";
import {
  cellOf,
  cellText,
  listCell,
  numberOf,
  textCell,
} from "./rows";

/* ------------------------------------------------------------------ timer */

export const Timer = defineComponent({
  name: "Timer",
  description:
    "a clock on the page: how many seconds it counts down from (with none it is a stopwatch), and the word for what it is timing",
  props: z.object({
    seconds: z.number().nullable().optional(),
    label: z.string().nullable().optional(),
  }),
  component: drawTimer,
});

/** Say a run of seconds the way a clock does, not the way a stopwatch log does. */
function clockText(total: number): string {
  const whole = Math.max(0, Math.round(total));
  const minutes = Math.floor(whole / 60);
  const seconds = whole % 60;
  return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
}

function TimerBlock(props: {
  ctx: ProgramContext;
  seconds: number | null;
  label: string;
}): JSX.Element {
  const { ctx, seconds, label } = props;
  const counting = seconds !== null && Number.isFinite(seconds);
  const [left, setLeft] = useState<number>(counting ? seconds : 0);
  const [running, setRunning] = useState<boolean>(!counting);

  useEffect(() => {
    if (!counting || !running) return;
    const beat = setInterval(() => {
      setLeft((held) => (held <= 0 ? 0 : held - 1));
    }, 1000);
    return () => {
      clearInterval(beat);
    };
  }, [counting, running]);

  const finished = counting && left <= 0;
  const tone = finished ? "danger" : running ? "accent" : "muted";

  return (
    <div style={programColumnStyle(ctx.t)}>
      <div style={{ ...programRowStyle(ctx.t), gap: innerGap(ctx.t) }}>
        <AdwaitaIcon
          name={counting ? "timer" : "schedule"}
          size={INLINE_GLYPH}
          color={programTextColor(ctx.t, tone)}
          style={{ flexShrink: 0 }}
        />
        <T
          size="title1"
          weight={programTitleWeight(ctx.t)}
          color={programTextColor(ctx.t, tone)}
          clamp={1}
          style={{ minWidth: 0 }}
        >
          {clockText(left)}
        </T>
        <div style={{ flexGrow: 1, minWidth: 0, minHeight: 1 }} />
        {label === "" ? null : (
          <T
            size="caption"
            color={mutedText(ctx.t)}
            clamp={2}
            style={{ minWidth: 0 }}
          >
            {label}
          </T>
        )}
      </div>
      {counting && seconds > 0 ? (
        <ProgressBar
          value={Math.round((left / seconds) * 100)}
          color={programProgressTone(finished ? "danger" : "accent")}
        />
      ) : null}
      <div style={{ ...programRowStyle(ctx.t), gap: innerGap(ctx.t) }}>
        <AdwaitaButton
          variant="default"
          size="sm"
          label={running ? "pause" : "run"}
          disabled={finished}
          onClick={() => setRunning((held) => !held)}
        />
        <AdwaitaButton
          variant="text"
          size="sm"
          label="reset"
          onClick={() => {
            setLeft(counting ? (seconds ?? 0) : 0);
            setRunning(!counting);
          }}
        />
        {finished ? (
          <T
            size="caption"
            color={programTextColor(ctx.t, "danger")}
            clamp={1}
            style={{ minWidth: 0 }}
          >
            {"elapsed"}
          </T>
        ) : null}
      </div>
    </div>
  );
}

export function drawTimer(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const seconds = prop<number | null>(node.props, "seconds", null);
  return (
    <TimerBlock
      ctx={ctx}
      seconds={seconds === null || !Number.isFinite(seconds) ? null : seconds}
      label={textProp(node.props, "label")}
    />
  );
}

/* ------------------------------------------------------------------- quiz */

const QUIZ_NAMES = ["question", "options", "answer", "why"] as const;

interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  why: string;
}

export const Quiz = defineComponent({
  name: "Quiz",
  description:
    "questions the human answers on the page: {question, options, answer: index, why?} — marked as they pick, with the reason shown after",
  props: z.object({
    questions: z.array(z.any()),
  }),
  component: drawQuiz,
});

const questionOf = (row: unknown): QuizQuestion => ({
  question: textCell(row, QUIZ_NAMES, 0) ?? cellText(row),
  options: listCell(row, QUIZ_NAMES, 1).map(cellText),
  answer: numberOf(cellOf(row, QUIZ_NAMES, 2)),
  why: textCell(row, QUIZ_NAMES, 3) ?? "",
});

function QuizBlock(props: {
  ctx: ProgramContext;
  questions: QuizQuestion[];
}): JSX.Element {
  const { ctx, questions } = props;
  const [picked, setPicked] = useState<Record<number, number>>({});

  const answeredCount = Object.keys(picked).length;
  const correct = questions.filter(
    (question, index) => picked[index] === question.answer,
  ).length;

  return (
    <div style={programColumnStyle(ctx.t)}>
      {questions.map((question, index) => {
        const chosen = picked[index];
        const judged = chosen !== undefined;
        const right = chosen === question.answer;

        return (
          <div key={`q-${String(index)}`} style={programColumnStyle(ctx.t)}>
            <div style={{ ...programRowStyle(ctx.t), alignItems: "start" }}>
              <T
                size="body"
                weight={programEmphasisWeight(ctx.t)}
                color={ctx.t.color.text.primary}
                clamp={3}
                style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
              >
                {`${String(index + 1)}. ${question.question}`}
              </T>
              {judged ? (
                <AdwaitaIcon
                  name={right ? "checkCircle" : "error"}
                  size={INLINE_GLYPH}
                  color={programTextColor(ctx.t, right ? "success" : "danger")}
                  style={{ flexShrink: 0 }}
                />
              ) : null}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                minWidth: 0,
                gap: innerGap(ctx.t),
              }}
            >
              {question.options.map((option, at) => (
                <AdwaitaButton
                  key={`o-${String(at)}`}
                  variant={
                    !judged
                      ? "default"
                      : at === question.answer
                        ? "suggested"
                        : at === chosen
                          ? "destructive"
                          : "text"
                  }
                  size="sm"
                  label={option}
                  onClick={() =>
                    setPicked((held) => ({ ...held, [index]: at }))
                  }
                />
              ))}
            </div>
            {judged && question.why !== "" ? (
              <T
                size="caption"
                color={mutedText(ctx.t)}
                clamp={4}
                style={{ minWidth: 0 }}
              >
                {question.why}
              </T>
            ) : null}
          </div>
        );
      })}
      {answeredCount === 0 ? null : (
        <T
          size="caption"
          color={mutedText(ctx.t)}
          clamp={2}
          style={{ minWidth: 0 }}
        >
          {`${String(correct)} of ${String(answeredCount)} right`}
        </T>
      )}
    </div>
  );
}

export function drawQuiz(node: ElementNode, ctx: ProgramContext): JSX.Element {
  return (
    <QuizBlock
      ctx={ctx}
      questions={listProp(node.props, "questions").map(questionOf)}
    />
  );
}

/* ------------------------------------------------------------- flashcards */

const CARD_NAMES = ["front", "back"] as const;

export const Flashcards = defineComponent({
  name: "Flashcards",
  description:
    "cards the human turns over: {front, back}, one at a time, in the order the program wrote them",
  props: z.object({
    cards: z.array(z.any()),
  }),
  component: drawFlashcards,
});

function FlashcardsBlock(props: {
  ctx: ProgramContext;
  cards: { front: string; back: string }[];
}): JSX.Element {
  const { ctx, cards } = props;
  const [at, setAt] = useState(0);
  const [turned, setTurned] = useState(false);
  const card = cards[Math.min(at, Math.max(0, cards.length - 1))];

  if (card === undefined)
    return (
      <T size="caption" color={mutedText(ctx.t)} clamp={2} style={{ minWidth: 0 }}>
        {"no cards"}
      </T>
    );

  return (
    <div style={programColumnStyle(ctx.t)}>
      <div
        onClick={() => setTurned((held) => !held)}
        style={{
          ...programColumnStyle(ctx.t),
          padding: innerGap(ctx.t),
          borderRadius: ctx.t.radius.md,
          borderWidth: HAIRLINE,
          borderColor: ctx.t.color.border.default,
          backgroundColor: ctx.t.color.surface.sunken,
          cursor: "pointer",
        }}
      >
        <T
          size={turned ? "body" : "title4"}
          weight={turned ? undefined : programEmphasisWeight(ctx.t)}
          color={ctx.t.color.text.primary}
          clamp={8}
          style={{ minWidth: 0 }}
        >
          {turned ? card.back : card.front}
        </T>
      </div>
      <div style={{ ...programRowStyle(ctx.t), gap: innerGap(ctx.t) }}>
        <AdwaitaButton
          variant="text"
          size="sm"
          label="←"
          disabled={at === 0}
          onClick={() => {
            setAt((held) => Math.max(0, held - 1));
            setTurned(false);
          }}
        />
        <T
          size="caption"
          color={mutedText(ctx.t)}
          clamp={1}
          style={{ minWidth: 0 }}
        >
          {`${String(at + 1)} / ${String(cards.length)} — ${turned ? "answer shown, click to hide" : "click to turn over"}`}
        </T>
        <div style={{ flexGrow: 1, minWidth: 0, minHeight: 1 }} />
        <AdwaitaButton
          variant="default"
          size="sm"
          label="→"
          disabled={at >= cards.length - 1}
          onClick={() => {
            setAt((held) => Math.min(cards.length - 1, held + 1));
            setTurned(false);
          }}
        />
      </div>
    </div>
  );
}

export function drawFlashcards(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const cards = listProp(node.props, "cards").map((row) => ({
    front: textCell(row, CARD_NAMES, 0) ?? cellText(row),
    back: textCell(row, CARD_NAMES, 1) ?? "",
  }));
  return <FlashcardsBlock ctx={ctx} cards={cards} />;
}

/* ------------------------------------------------------------ walkthrough */

const WALK_NAMES = ["title", "body", "code", "language"] as const;

export const Walkthrough = defineComponent({
  name: "Walkthrough",
  description:
    "a guided walk, one step at a time: {title, body, code?, language?} — the right shape for steps to follow, a lesson, or a migration",
  props: z.object({
    steps: z.array(z.any()),
  }),
  component: drawWalkthrough,
});

function WalkthroughBlock(props: {
  ctx: ProgramContext;
  steps: { title: string; body: string; code: string; language: string }[];
}): JSX.Element {
  const { ctx, steps } = props;
  const [at, setAt] = useState(0);
  const step = steps[Math.min(at, Math.max(0, steps.length - 1))];

  if (step === undefined)
    return (
      <T size="caption" color={mutedText(ctx.t)} clamp={2} style={{ minWidth: 0 }}>
        {"no steps"}
      </T>
    );

  return (
    <div style={programColumnStyle(ctx.t)}>
      <div style={programColumnStyle(ctx.t)}>
        <T
          size="title4"
          weight={programTitleWeight(ctx.t)}
          color={ctx.t.color.text.primary}
          clamp={3}
          style={{ minWidth: 0 }}
        >
          {`${String(at + 1)} of ${String(steps.length)} — ${step.title}`}
        </T>
        {step.body === "" ? null : (
          <T
            size="body"
            color={ctx.t.color.text.primary}
            clamp={10}
            style={{ minWidth: 0 }}
          >
            {step.body}
          </T>
        )}
      </div>
      {step.code === "" ? null : (
        <div
          style={{
            ...programColumnStyle(ctx.t),
            gap: 0,
            padding: innerGap(ctx.t),
            borderRadius: ctx.t.radius.sm,
            backgroundColor: ctx.t.color.surface.sunken,
          }}
        >
          <T
            size="caption"
            color={mutedText(ctx.t)}
            clamp={1}
            style={{ minWidth: 0 }}
          >
            {step.language}
          </T>
          <T
            size="caption"
            color={ctx.t.color.text.primary}
            clamp={20}
            style={{
              fontFamily: ctx.t.type.fontFamilyMono,
              minWidth: 0,
            }}
          >
            {step.code}
          </T>
        </div>
      )}
      <div style={{ ...programRowStyle(ctx.t), gap: innerGap(ctx.t) }}>
        <AdwaitaButton
          variant="text"
          size="sm"
          label="← back"
          disabled={at === 0}
          onClick={() => setAt((held) => Math.max(0, held - 1))}
        />
        <AdwaitaButton
          variant="suggested"
          size="sm"
          label={at >= steps.length - 1 ? "done" : "next →"}
          disabled={at >= steps.length - 1}
          onClick={() => setAt((held) => Math.min(steps.length - 1, held + 1))}
        />
        <div style={{ flexGrow: 1, minWidth: 0, minHeight: 1 }} />
        <ProgressBar
          value={Math.round(((at + 1) / steps.length) * 100)}
          color={programProgressTone(null)}
        />
      </div>
    </div>
  );
}

export function drawWalkthrough(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const steps = listProp(node.props, "steps").map((row) => ({
    title: textCell(row, WALK_NAMES, 0) ?? cellText(row),
    body: textCell(row, WALK_NAMES, 1) ?? "",
    code: textCell(row, WALK_NAMES, 2) ?? "",
    language: textCell(row, WALK_NAMES, 3) ?? "",
  }));
  return <WalkthroughBlock ctx={ctx} steps={steps} />;
}
