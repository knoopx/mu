/**
 * The status area of the language: what the screen says the work is doing.
 *
 * These three are the running commentary of a screen — the sections of a write-up
 * with what each one rests on, the list of things a change did and did not do, the
 * stages a job has reached. The mark is the same vocabulary everywhere in mu:
 * `done`, `running`, `current`, `pending`, `skipped`, `error`, said by
 * `lib/theme.ts` so a program's check and the log's own marks agree.
 */

import type { JSX } from "react";
import { defineComponent, type ElementNode } from "@openuidev/lang-core";
import { Icon, ProgressBar, T } from "adwaita-gpuix";
import { z } from "zod/v4";

import { StateSpinner } from "../../../core/components/StateSpinner";
import { HAIRLINE, INLINE_GLYPH } from "../../../core/lib/ui/tokens";
import { mutedText } from "../../../core/lib/ui/theme";
import {
  groupGap,
  innerGap,
  programEmphasisWeight,
  programMarkIndent,
} from "../../lib/tokens";
import {
  programProgressTone,
  programRule,
  programStatusColor,
  programStatusGlyph,
  programTextColor,
  type ProgramTone,
} from "../../lib/theme";
import type { ProgramContext } from "./context";
import { listProp, prop, textOf } from "./context";
import type { ProgramStatus } from "../../types";
import { cellOf, statusOf, textCell } from "./rows";

/** The bar of a run in progress: thicker than a meter's rule, because the eye is
 *  watching it move. */
const STEP_BAR_HEIGHT = 6;

/* -------------------------------------------------------------- sections */

const SECTION_NAMES = ["title", "body", "status", "trailing"] as const;

export const Sections = defineComponent({
  name: "Sections",
  description:
    "the parts of a write-up: each with its standing, what it rests on, and one line of its own",
  props: z.object({
    items: z.array(z.any()),
  }),
  component: drawSections,
});

/**
 * One section per row: a mark, its title, the count it rests on to the right, and
 * the line that says what it holds. A rule between sections, none after the last —
 * the same rule the screen's other lists wear.
 */
export function drawSections(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const items = listProp(node.props, "items");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
      }}
    >
      {items.map((row, index) => {
        const status = statusOf(cellOf(row, SECTION_NAMES, 2), "done");
        const trailing = textCell(row, SECTION_NAMES, 3);
        const body = textCell(row, SECTION_NAMES, 1);
        const last = index === items.length - 1;
        return (
          <div
            key={`s-${String(index)}`}
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: "100%",
                minWidth: 0,
                gap: innerGap(ctx.t),
                paddingTop: index === 0 ? 0 : groupGap(ctx.t),
                paddingBottom: last ? 0 : groupGap(ctx.t),
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  width: "100%",
                  minWidth: 0,
                  gap: innerGap(ctx.t),
                }}
              >
                <StatusMark status={status} ctx={ctx} />
                <T
                  size="list"
                  weight={programEmphasisWeight(ctx.t)}
                  color={ctx.t.color.text.primary}
                  clamp={2}
                  style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
                >
                  {textCell(row, SECTION_NAMES, 0) ?? ""}
                </T>
                {trailing === null ? null : (
                  <T
                    size="caption"
                    color={mutedText(ctx.t)}
                    clamp={1}
                    style={{
                      fontFamily: ctx.t.type.fontFamilyMono,
                      whiteSpace: "nowrap",
                      minWidth: 0,
                    }}
                  >
                    {trailing}
                  </T>
                )}
              </div>
              {body === null ? null : (
                <T
                  size="body"
                  color={mutedText(ctx.t)}
                  clamp={4}
                  style={{ marginLeft: programMarkIndent(ctx.t), minWidth: 0 }}
                >
                  {body}
                </T>
              )}
            </div>
            {last ? null : (
              <div
                style={{
                  width: "100%",
                  height: HAIRLINE,
                  flexShrink: 0,
                  backgroundColor: programRule(ctx.t),
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** The mark a line of work wears: a glyph in the status's own colour, a spinner while it runs. */
function StatusMark({
  status,
  ctx,
}: {
  status: ProgramStatus;
  ctx: ProgramContext;
}): JSX.Element {
  if (status === "running") return <StateSpinner />;
  const glyph = programStatusGlyph(status);
  if (glyph === null)
    return <div style={{ width: INLINE_GLYPH, flexShrink: 0 }} />;
  return (
    <Icon
      name={glyph}
      size={INLINE_GLYPH}
      color={programStatusColor(ctx.t, status)}
      style={{ flexShrink: 0 }}
    />
  );
}

/* ---------------------------------------------------------------- todos */

const TODO_NAMES = ["text", "status", "note"] as const;

export const Todos = defineComponent({
  name: "Todos",
  description:
    "the list a change worked through: done, skipped, running, still to do — struck through when it is behind",
  props: z.object({
    items: z.array(z.any()),
  }),
  component: drawTodos,
});

/** A line the work is behind reads struck through: the screen says what happened
 *  without pretending the line is absent. */
const SETTLED: ProgramStatus[] = ["done", "skipped", "error"];

export function drawTodos(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const items = listProp(node.props, "items");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
      {items.map((row, index) => {
        const status = statusOf(cellOf(row, TODO_NAMES, 1), "pending");
        const settled = SETTLED.includes(status);
        const note = textCell(row, TODO_NAMES, 2);
        return (
          <div
            key={`t-${String(index)}`}
            style={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              minWidth: 0,
              gap: 2,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                width: "100%",
                minWidth: 0,
                gap: innerGap(ctx.t),
              }}
            >
              <StatusMark status={status} ctx={ctx} />
              <T
                size="list"
                color={
                  settled ? mutedText(ctx.t) : ctx.t.color.text.primary
                }
                clamp={2}
                style={{
                  flexGrow: 1,
                  flexBasis: 0,
                  minWidth: 0,
                  textDecoration: settled ? "line-through" : undefined,
                }}
              >
                {textCell(row, TODO_NAMES, 0) ?? ""}
              </T>
            </div>
            {note === null ? null : (
              <T
                size="caption"
                color={mutedText(ctx.t)}
                clamp={3}
                style={{ marginLeft: programMarkIndent(ctx.t), minWidth: 0 }}
              >
                {note}
              </T>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- steps */

const STEP_NAMES = ["name", "status"] as const;

export const Steps = defineComponent({
  name: "Steps",
  description:
    "the stages a job runs through: how far it got as one bar, the stage names, and what stopped it",
  props: z.object({
    steps: z.array(z.any()),

    /** How many are finished. Leave it out and the steps that say they are count. */
    done: z.number().nullable().optional(),

    tone: z.string().nullable().optional(),

    /** The line about the run itself — what it got to, and what it did not. */
    note: z.union([z.string(), z.number()]).nullable().optional(),
  }),
  component: drawSteps,
});

export function drawSteps(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const rows = listProp(node.props, "steps");
  const tone = prop<ProgramTone | null>(node.props, "tone", null);
  const note = textOf(node.props.note);

  const steps = rows.map((row) => ({
    name: textCell(row, STEP_NAMES, 0) ?? "",
    status: statusOf(cellOf(row, STEP_NAMES, 1), "pending"),
  }));
  const total = Math.max(steps.length, 1);
  const settled = steps.filter((step) => step.status === "done").length;
  const finished = prop<number | null>(node.props, "done", null) ?? settled;
  const percent = Math.round((Math.min(finished, total) / total) * 100);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: groupGap(ctx.t),
      }}
    >
      <ProgressBar
        value={percent}
        color={programProgressTone(tone)}
        height={STEP_BAR_HEIGHT}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          width: "100%",
          minWidth: 0,
          gap: innerGap(ctx.t),
        }}
      >
        {steps.map((step, index) => (
          <T
            key={`st-${String(index)}`}
            size="caption"
            color={
              step.status === "error"
                ? programTextColor(ctx.t, "danger")
                : step.status === "done"
                  ? ctx.t.color.text.primary
                  : step.status === "pending"
                    ? mutedText(ctx.t)
                    : programTextColor(ctx.t, "accent")
            }
            clamp={1}
            style={{
              fontFamily: ctx.t.type.fontFamilyMono,
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {step.name}
          </T>
        ))}
      </div>
      {note === null ? null : (
        <T
          size="body"
          color={mutedText(ctx.t)}
          clamp={4}
          style={{ minWidth: 0 }}
        >
          {note}
        </T>
      )}
    </div>
  );
}

