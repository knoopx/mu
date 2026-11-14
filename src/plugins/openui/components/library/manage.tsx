/**
 * The manage area of the language: the shapes a project is planned and tracked
 * in — a board, a dated plan, the standing of a set of workstreams, a plan the
 * human approves before work starts, a decision weighed on criteria, an estimate
 * with its spread.
 *
 * These are the components the reference plugin uses for the part of an answer
 * that is a *proposal* rather than a report, and the one rule they all keep is
 * its: a plan or a decision is already the question, so a screen that shows one
 * does not also ask for it in prose. Where the human has a say, they have it in
 * the block — approving a plan stages the answer in their own message, and the
 * weights of a decision recompute on the page.
 */

import { useState, type JSX } from "react";
import { defineComponent, type ElementNode } from "@openuidev/lang-core";
import {
  Badge as AdwaitaBadge,
  Button as AdwaitaButton,
  Icon as AdwaitaIcon,
  ProgressBar,
  T,
  Table as AdwaitaTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "adwaita-gpuix";
import { z } from "zod/v4";

import {
  HAIRLINE,
  INLINE_GLYPH,
  ROW_HEIGHT,
} from "../../../core/lib/ui/tokens";
import { mutedText } from "../../../core/lib/ui/theme";
import {
  groupGap,
  innerGap,
  programEmphasisWeight,
  programTitleWeight,
} from "../../lib/tokens";
import {
  programProgressTone,
  programRule,
  programTextColor,
  type ProgramTone,
} from "../../lib/theme";
import { choiceRunPosition } from "../../lib/answer/positions";
import type { ProgramContext } from "./context";
import {
  listProp,
  programColumnStyle,
  programRuledRowStyle,
  programRowStyle,
  textProp,
} from "./context";
import {
  cellOf,
  cellText,
  listCell,
  numberOf,
  statusOf,
  textCell,
} from "./rows";

/** How wide a roadmap's label column stands: enough for a lane and a phase. */
const ROADMAP_LABEL = 200;

/* ------------------------------------------------------------------ board */

const BOARD_NAMES = ["title", "status", "detail", "owner"] as const;

export const Board = defineComponent({
  name: "Board",
  description:
    "a board of work: [{title, status, detail?, owner?}] gathered into its columns — the columns are the statuses the items name, in the order they first appear",
  props: z.object({
    items: z.array(z.any()),
    columns: z.array(z.any()).nullable().optional(),
  }),
  component: drawBoard,
});

/** The columns of a board: the ones the program named, or the ones its items name. */
function boardColumnsOf(node: ElementNode, rows: readonly unknown[]): string[] {
  const named = listProp(node.props, "columns")
    .map(cellText)
    .filter((name) => name !== "");
  if (named.length > 0) return named;
  const found: string[] = [];
  for (const row of rows) {
    const status = textCell(row, BOARD_NAMES, 1) ?? "open";
    if (!found.includes(status)) found.push(status);
  }
  return found;
}

function drawBoard(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const rows = listProp(node.props, "items");
  const columns = boardColumnsOf(node, rows);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "start",
        flexWrap: "wrap",
        width: "100%",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
      {columns.map((column, index) => {
        const cards = rows.filter(
          (row) => (textCell(row, BOARD_NAMES, 1) ?? "open") === column,
        );
        return (
          <div
            key={`b-${String(index)}`}
            style={{
              ...programColumnStyle(ctx.t),
              flexGrow: 1,
              flexBasis: 180,
              minWidth: 0,
              gap: 0,
              borderRadius: ctx.t.radius.sm,
              backgroundColor: ctx.t.color.surface.sunken,
            }}
          >
            <div
              style={{
                ...programRowStyle(ctx.t),
                padding: innerGap(ctx.t),
                borderBottomWidth: HAIRLINE,
                borderColor: programRule(ctx.t),
              }}
            >
              <T
                size="caption"
                weight={programEmphasisWeight(ctx.t)}
                color={mutedText(ctx.t)}
                clamp={1}
                style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
              >
                {column}
              </T>
              <T
                size="caption"
                color={mutedText(ctx.t)}
                clamp={1}
                style={{ flexShrink: 0 }}
              >
                {String(cards.length)}
              </T>
            </div>
            <div
              style={{ ...programColumnStyle(ctx.t), padding: innerGap(ctx.t) }}
            >
              {cards.map((row, at) => (
                <div key={`c-${String(at)}`} style={programColumnStyle(ctx.t)}>
                  <T
                    size="list"
                    color={ctx.t.color.text.primary}
                    clamp={3}
                    style={{ minWidth: 0 }}
                  >
                    {textCell(row, BOARD_NAMES, 0) ?? cellText(row)}
                  </T>
                  {textCell(row, BOARD_NAMES, 2) === "" ||
                  textCell(row, BOARD_NAMES, 2) === null ? null : (
                    <T
                      size="caption"
                      color={mutedText(ctx.t)}
                      clamp={3}
                      style={{ minWidth: 0 }}
                    >
                      {textCell(row, BOARD_NAMES, 2)}
                    </T>
                  )}
                  {textCell(row, BOARD_NAMES, 3) === "" ||
                  textCell(row, BOARD_NAMES, 3) === null ? null : (
                    <T
                      size="caption"
                      color={mutedText(ctx.t)}
                      clamp={1}
                      style={{ minWidth: 0 }}
                    >
                      {`— ${textCell(row, BOARD_NAMES, 3)}`}
                    </T>
                  )}
                </div>
              ))}
              {cards.length === 0 ? (
                <T
                  size="caption"
                  color={mutedText(ctx.t)}
                  clamp={1}
                  style={{ minWidth: 0 }}
                >
                  {"—"}
                </T>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------- roadmap */

const ROADMAP_NAMES = [
  "title",
  "start",
  "end",
  "lane",
  "status",
  "milestone",
] as const;

export const Roadmap = defineComponent({
  name: "Roadmap",
  description:
    "a dated plan of phases: [{title, start, end, lane?, status?, milestone?}] with yyyy-mm-dd dates, drawn as bars on one axis",
  props: z.object({
    items: z.array(z.any()),
  }),
  component: drawRoadmap,
});

/** A yyyy-mm-dd date as a day count, or null when the program wrote no date. */
function dayOf(value: unknown): number | null {
  const text = cellText(value).trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (match === null) return null;
  const [, year, month, day] = match;
  const stamp = Date.UTC(Number(year), Number(month) - 1, Number(day));
  return Number.isFinite(stamp) ? Math.round(stamp / 86_400_000) : null;
}

const dayWord = (days: number): string => {
  const date = new Date(days * 86_400_000);
  return `${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
};

function drawRoadmap(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const rows = listProp(node.props, "items").map((row) => ({
    title: textCell(row, ROADMAP_NAMES, 0) ?? cellText(row),
    from: dayOf(cellOf(row, ROADMAP_NAMES, 1)),
    to: dayOf(cellOf(row, ROADMAP_NAMES, 2)),
    lane: textCell(row, ROADMAP_NAMES, 3) ?? "",
    status: statusOf(cellOf(row, ROADMAP_NAMES, 4), "pending"),
    milestone: cellOf(row, ROADMAP_NAMES, 5) === true,
    startWord: cellText(cellOf(row, ROADMAP_NAMES, 1)),
    endWord: cellText(cellOf(row, ROADMAP_NAMES, 2)),
  }));

  const dated = rows.filter((row) => row.from !== null && row.to !== null);
  const first = Math.min(...dated.map((row) => row.from ?? Infinity), Infinity);
  const last = Math.max(...dated.map((row) => row.to ?? -Infinity), -Infinity);
  const span =
    Number.isFinite(first) && Number.isFinite(last)
      ? Math.max(1, last - first + 1)
      : 0;

  return (
    <div style={programColumnStyle(ctx.t)}>
      {rows.map((row, index) => {
        const tone: ProgramTone =
          row.status === "done"
            ? "success"
            : row.status === "error"
              ? "danger"
              : row.status === "current"
                ? "accent"
                : "muted";
        const left =
          span === 0 || row.from === null
            ? 0
            : Math.round(((row.from - first) / span) * 1000) / 10;
        const width =
          span === 0 || row.from === null || row.to === null
            ? 100
            : Math.max(
                2,
                Math.round(((row.to - row.from + 1) / span) * 1000) / 10,
              );

        return (
          <div
            key={`r-${String(index)}`}
            style={{
              ...programRowStyle(ctx.t),
              alignItems: "center",
              minHeight: ROW_HEIGHT,
            }}
          >
            <T
              size="list"
              color={ctx.t.color.text.primary}
              clamp={1}
              style={{ width: ROADMAP_LABEL, flexShrink: 0, minWidth: 0 }}
            >
              {row.lane === "" ? row.title : `${row.lane} · ${row.title}`}
            </T>
            <div
              style={{
                ...programRowStyle(ctx.t),
                gap: 0,
                flexGrow: 1,
                flexBasis: 0,
                minWidth: 0,
                height: 12,
                borderRadius: ctx.t.radius.xs,
                backgroundColor: ctx.t.color.surface.sunken,
              }}
            >
              {left > 0 ? (
                <div style={{ flexGrow: left, minHeight: 1, minWidth: 0 }} />
              ) : null}
              <div
                style={{
                  flexGrow: width,
                  minHeight: 1,
                  minWidth: 2,
                  borderRadius: ctx.t.radius.xs,
                  backgroundColor: programTextColor(ctx.t, tone),
                  opacity: row.status === "pending" ? 0.45 : 1,
                }}
              />
              {span === 0 ? null : (
                <div
                  style={{
                    flexGrow: Math.max(0, span - (left + width)),
                    minHeight: 1,
                    minWidth: 0,
                  }}
                />
              )}
            </div>
            <T
              size="caption"
              color={mutedText(ctx.t)}
              clamp={1}
              style={{
                flexShrink: 0,
                minWidth: 0,
                fontFamily: ctx.t.type.fontFamilyMono,
              }}
            >
              {row.milestone
                ? `◆ ${row.endWord}`
                : `${row.startWord} → ${row.endWord}`}
            </T>
          </div>
        );
      })}
      {span === 0 ? null : (
        <T
          size="caption"
          color={mutedText(ctx.t)}
          clamp={1}
          style={{ minWidth: 0 }}
        >
          {`${dayWord(first)} → ${dayWord(last)} · ${String(span)} days`}
        </T>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- status */

const STATUS_NAMES = [
  "name",
  "status",
  "progress",
  "owner",
  "due",
  "note",
] as const;

/** What a workstream's own word for itself means, as a tone and a mark. */
function standingOf(word: unknown): { tone: ProgramTone; icon: string } {
  const held = cellText(word)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  if (held === "ontrack" || held === "done" || held === "green")
    return { tone: "success", icon: "checkCircleOutline" };
  if (held === "atrisk" || held === "yellow" || held === "warn")
    return { tone: "warning", icon: "error" };
  if (held === "offtrack" || held === "red" || held === "blocked")
    return { tone: "danger", icon: "error" };
  return { tone: "muted", icon: "radioButtonUnchecked" };
}

export const Status = defineComponent({
  name: "Status",
  description:
    "the standing of a set of work: [{name, status: on-track|at-risk|off-track|done, progress?, owner?, due?, note?}]",
  props: z.object({
    items: z.array(z.any()),
  }),
  component: drawStatus,
});

function drawStatus(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const items = listProp(node.props, "items");

  return (
    <div style={programColumnStyle(ctx.t)}>
      {items.map((row, index) => {
        const standing = standingOf(cellOf(row, STATUS_NAMES, 1));
        const percent = Math.max(
          0,
          Math.min(100, Math.round(numberOf(cellOf(row, STATUS_NAMES, 2)))),
        );
        const owner = textCell(row, STATUS_NAMES, 3) ?? "";
        const due = textCell(row, STATUS_NAMES, 4) ?? "";
        const note = textCell(row, STATUS_NAMES, 5) ?? "";

        return (
          <div
            key={`s-${String(index)}`}
            style={programRuledRowStyle(ctx.t, index)}
          >
            <div style={{ ...programRowStyle(ctx.t), alignItems: "center" }}>
              <AdwaitaIcon
                name={standing.icon}
                size={INLINE_GLYPH}
                color={programTextColor(ctx.t, standing.tone)}
                style={{ flexShrink: 0 }}
              />
              <T
                size="body"
                color={ctx.t.color.text.primary}
                clamp={2}
                style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
              >
                {textCell(row, STATUS_NAMES, 0) ?? cellText(row)}
              </T>
              {owner === "" ? null : (
                <T
                  size="caption"
                  color={mutedText(ctx.t)}
                  clamp={1}
                  style={{ flexShrink: 0, minWidth: 0 }}
                >
                  {owner}
                </T>
              )}
              {due === "" ? null : (
                <AdwaitaBadge variant="secondary" size="sm">
                  {due}
                </AdwaitaBadge>
              )}
            </div>
            <ProgressBar
              value={percent}
              color={programProgressTone(standing.tone)}
            />
            {note === "" ? null : (
              <T
                size="caption"
                color={mutedText(ctx.t)}
                clamp={3}
                style={{ minWidth: 0 }}
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

/* ------------------------------------------------------------------- plan */

const PLAN_NAMES = ["title", "detail", "files", "risk", "estimate"] as const;

export const Plan = defineComponent({
  name: "Plan",
  description:
    "the steps a human approves before work starts: [{title, detail?, files?, risk?, estimate?}] — the block is the question, so approving it here puts the answer in their message",
  props: z.object({
    steps: z.array(z.any()),
  }),
  component: drawPlan,
});

function drawPlan(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const steps = listProp(node.props, "steps");
  const position = choiceRunPosition(ctx.path);
  const sent = ctx.sentAnswer(position);
  const staged = ctx.staged(position);
  const closed = ctx.answered || sent !== "";

  return (
    <div style={programColumnStyle(ctx.t)}>
      {steps.map((row, index) => {
        const risk = cellText(cellOf(row, PLAN_NAMES, 3))
          .trim()
          .toLowerCase();
        const files = listCell(row, PLAN_NAMES, 2);
        const detail = textCell(row, PLAN_NAMES, 1) ?? "";
        const estimate = textCell(row, PLAN_NAMES, 4) ?? "";

        return (
          <div
            key={`p-${String(index)}`}
            style={{
              ...programRowStyle(ctx.t),
              alignItems: "start",
              gap: innerGap(ctx.t),
              paddingTop: index === 0 ? 0 : innerGap(ctx.t),
            }}
          >
            <T
              size="list"
              weight={programEmphasisWeight(ctx.t)}
              color={mutedText(ctx.t)}
              clamp={1}
              style={{
                flexShrink: 0,
                minWidth: 0,
                fontFamily: ctx.t.type.fontFamilyMono,
              }}
            >
              {`${String(index + 1)}.`}
            </T>
            <div
              style={{
                ...programColumnStyle(ctx.t),
                flexGrow: 1,
                flexBasis: 0,
                minWidth: 0,
              }}
            >
              <T
                size="body"
                color={ctx.t.color.text.primary}
                clamp={3}
                style={{ minWidth: 0 }}
              >
                {textCell(row, PLAN_NAMES, 0) ?? cellText(row)}
              </T>
              {detail === "" ? null : (
                <T
                  size="caption"
                  color={mutedText(ctx.t)}
                  clamp={4}
                  style={{ minWidth: 0 }}
                >
                  {detail}
                </T>
              )}
              {files.length === 0 ? null : (
                <T
                  size="caption"
                  color={mutedText(ctx.t)}
                  clamp={3}
                  style={{ minWidth: 0, fontFamily: ctx.t.type.fontFamilyMono }}
                >
                  {files.map(cellText).join("  ")}
                </T>
              )}
            </div>
            {estimate === "" ? null : (
              <AdwaitaBadge variant="secondary" size="sm">
                {estimate}
              </AdwaitaBadge>
            )}
            {risk === "" ? null : (
              <AdwaitaBadge
                variant={
                  risk === "low"
                    ? "outline"
                    : risk === "medium"
                      ? "warning"
                      : "destructive"
                }
                size="sm"
              >
                {risk}
              </AdwaitaBadge>
            )}
          </div>
        );
      })}
      {closed ? (
        <T
          size="caption"
          color={programTextColor(ctx.t, "muted")}
          clamp={3}
          style={{ minWidth: 0 }}
        >
          {sent === "" ? "sent" : sent}
        </T>
      ) : (
        <div style={{ ...programRowStyle(ctx.t), gap: innerGap(ctx.t) }}>
          <AdwaitaButton
            variant={staged === "Approved — go ahead" ? "suggested" : "default"}
            size="sm"
            label="Approved — go ahead"
            onClick={() =>
              ctx.stage(
                position,
                staged === "Approved — go ahead" ? "" : "Approved — go ahead",
              )
            }
          />
          <AdwaitaButton
            variant={
              staged === "Not yet — let me change it" ? "suggested" : "default"
            }
            size="sm"
            label="Not yet — let me change it"
            onClick={() =>
              ctx.stage(
                position,
                staged === "Not yet — let me change it"
                  ? ""
                  : "Not yet — let me change it",
              )
            }
          />
          {staged === "" ? null : (
            <T
              size="caption"
              color={programTextColor(ctx.t, "muted")}
              clamp={2}
              style={{ minWidth: 0 }}
            >
              {"in your message — send it with your reply"}
            </T>
          )}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------- decision */

const DECISION_OPTION_NAMES = ["name", "scores", "pros", "cons"] as const;
const CRITERION_NAMES = ["name", "weight"] as const;

export const Decision = defineComponent({
  name: "Decision",
  description:
    "options weighed against criteria: options [{name, scores: 1-5 per criterion, pros?, cons?}] and the criteria — the human moves the weights and the totals follow, on the page",
  props: z.object({
    options: z.array(z.any()),
    criteria: z.array(z.any()),
  }),
  component: drawDecision,
});

function DecisionBlock(props: {
  ctx: ProgramContext;
  options: { name: string; scores: number[]; pros: string[]; cons: string[] }[];
  criteria: string[];
}): JSX.Element {
  const { ctx, options, criteria } = props;
  const [weights, setWeights] = useState<number[]>(criteria.map(() => 1));

  const totalOf = (scores: readonly number[]): number =>
    scores.reduce(
      (sum, score, index) => sum + numberOf(score) * (weights[index] ?? 1),
      0,
    );

  const best = options.reduce(
    (best, option) => Math.max(best, totalOf(option.scores)),
    0,
  );

  return (
    <div style={programColumnStyle(ctx.t)}>
      <AdwaitaTable
        density="compact"
        frame="bare"
        style={{ width: "100%", minWidth: 0 }}
      >
        <TableHeader key="header">
          <TableHead key="h-name">{""}</TableHead>
          {criteria.map((criterion, index) => (
            <TableHead key={`h-${String(index)}`}>{criterion}</TableHead>
          ))}
          <TableHead key="h-total" align="right">
            {"Total"}
          </TableHead>
        </TableHeader>
        <TableBody key="body">
          {criteria.map((_, index) => (
            <TableRow key={`w-${String(index)}`}>
              <TableCell key="w-label">
                {`weight · ${criteria[index] ?? ""}`}
              </TableCell>
              <TableCell key={`w-${String(index)}`}>
                <div
                  style={{ ...programRowStyle(ctx.t), gap: innerGap(ctx.t) }}
                >
                  <AdwaitaButton
                    variant="text"
                    size="sm"
                    label="−"
                    onClick={() =>
                      setWeights((held) =>
                        held.map((weight, at) =>
                          at === index ? Math.max(0, weight - 1) : weight,
                        ),
                      )
                    }
                  />
                  <T
                    size="list"
                    weight={programEmphasisWeight(ctx.t)}
                    color={ctx.t.color.text.primary}
                    clamp={1}
                    style={{
                      minWidth: 0,
                      fontFamily: ctx.t.type.fontFamilyMono,
                    }}
                  >
                    {String(weights[index] ?? 1)}
                  </T>
                  <AdwaitaButton
                    variant="text"
                    size="sm"
                    label="+"
                    onClick={() =>
                      setWeights((held) =>
                        held.map((weight, at) =>
                          at === index ? Math.min(5, weight + 1) : weight,
                        ),
                      )
                    }
                  />
                </div>
              </TableCell>
              <TableCell key="w-total">{""}</TableCell>
            </TableRow>
          ))}
          {options.map((option, index) => {
            const total = totalOf(option.scores);
            return (
              <TableRow key={`o-${String(index)}`}>
                <TableCell key="o-name">{option.name}</TableCell>
                {option.scores.map((score, at) => (
                  <TableCell
                    key={`o-${String(index)}-${String(at)}`}
                    align="right"
                  >
                    {String(score)}
                  </TableCell>
                ))}
                <TableCell key="o-total" align="right">
                  {String(Math.round(total * 10) / 10)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </AdwaitaTable>
      {options.map((option, index) => (
        <div key={`d-${String(index)}`} style={programColumnStyle(ctx.t)}>
          <T
            size="caption"
            weight={programEmphasisWeight(ctx.t)}
            color={
              totalOf(option.scores) === best && best > 0
                ? programTextColor(ctx.t, "success")
                : mutedText(ctx.t)
            }
            clamp={2}
            style={{ minWidth: 0 }}
          >
            {option.name}
          </T>
          {option.pros.length === 0 && option.cons.length === 0 ? null : (
            <T
              size="caption"
              color={mutedText(ctx.t)}
              clamp={4}
              style={{ minWidth: 0 }}
            >
              {[
                ...option.pros.map((pro) => `+ ${pro}`),
                ...option.cons.map((con) => `− ${con}`),
              ].join("   ")}
            </T>
          )}
        </div>
      ))}
    </div>
  );
}

function drawDecision(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const criteria = listProp(node.props, "criteria").map((criterion) =>
    typeof criterion === "object" &&
    criterion !== null &&
    !Array.isArray(criterion)
      ? (textCell(criterion, CRITERION_NAMES, 0) ?? "")
      : cellText(criterion),
  );

  const options = listProp(node.props, "options").map((row) => ({
    name: textCell(row, DECISION_OPTION_NAMES, 0) ?? cellText(row),
    scores: listCell(row, DECISION_OPTION_NAMES, 1).map((score) =>
      numberOf(score),
    ),
    pros: listCell(row, DECISION_OPTION_NAMES, 2).map(cellText),
    cons: listCell(row, DECISION_OPTION_NAMES, 3).map(cellText),
  }));

  return <DecisionBlock ctx={ctx} options={options} criteria={criteria} />;
}

/* --------------------------------------------------------------- estimate */

const ESTIMATE_NAMES = ["title", "low", "likely", "high"] as const;

export const Estimate = defineComponent({
  name: "Estimate",
  description:
    "three-point effort: [{title, low, high, likely?}] — the spread is kept, so the screen says a likely total and a worrying one rather than one number",
  props: z.object({
    tasks: z.array(z.any()),
    unit: z.string().nullable().optional(),
  }),
  component: drawEstimate,
});

const figureWord = (value: number): string =>
  String(Math.round(value * 10) / 10);

function drawEstimate(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const tasks = listProp(node.props, "tasks").map((row) => {
    const low = numberOf(cellOf(row, ESTIMATE_NAMES, 1));
    const high = numberOf(cellOf(row, ESTIMATE_NAMES, 3), low);
    const likely = numberOf(cellOf(row, ESTIMATE_NAMES, 2), (low + high) / 2);
    const mean = (low + 4 * likely + high) / 6;
    const deviation = (high - low) / 6;
    return {
      title: textCell(row, ESTIMATE_NAMES, 0) ?? cellText(row),
      low,
      likely,
      high,
      mean,
      variance: deviation * deviation,
    };
  });

  const unit = textProp(node.props, "unit");
  const said = (value: number): string =>
    unit === "" ? figureWord(value) : `${figureWord(value)} ${unit}`;
  const p50 = tasks.reduce((sum, task) => sum + task.mean, 0);
  const spread = Math.sqrt(tasks.reduce((sum, task) => sum + task.variance, 0));
  const p90 = p50 + 1.282 * spread;

  return (
    <div style={programColumnStyle(ctx.t)}>
      <div style={{ ...programRowStyle(ctx.t), gap: groupGap(ctx.t) }}>
        <T
          size="title1"
          weight={programTitleWeight(ctx.t)}
          color={ctx.t.color.text.primary}
          clamp={1}
          style={{ minWidth: 0 }}
        >
          {said(p50)}
        </T>
        <T
          size="body"
          color={mutedText(ctx.t)}
          clamp={1}
          style={{ minWidth: 0 }}
        >
          {"likely (P50)"}
        </T>
        <div style={{ flexGrow: 1, minWidth: 0, minHeight: 1 }} />
        <AdwaitaBadge variant="warning" size="sm">
          {`${said(p90)} P90`}
        </AdwaitaBadge>
      </div>
      <AdwaitaTable
        density="compact"
        frame="bare"
        style={{ width: "100%", minWidth: 0 }}
      >
        <TableHeader key="header">
          <TableHead key="h-title">{"Task"}</TableHead>
          <TableHead key="h-low" align="right">
            {"Low"}
          </TableHead>
          <TableHead key="h-likely" align="right">
            {"Likely"}
          </TableHead>
          <TableHead key="h-high" align="right">
            {"High"}
          </TableHead>
        </TableHeader>
        <TableBody key="body">
          {tasks.map((task, index) => (
            <TableRow key={`t-${String(index)}`}>
              <TableCell key={`t-${String(index)}-title`}>
                {task.title}
              </TableCell>
              <TableCell key={`t-${String(index)}-low`} align="right">
                {figureWord(task.low)}
              </TableCell>
              <TableCell key={`t-${String(index)}-likely`} align="right">
                {figureWord(task.likely)}
              </TableCell>
              <TableCell key={`t-${String(index)}-high`} align="right">
                {figureWord(task.high)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </AdwaitaTable>
      {tasks.length === 0 ? null : (
        <T
          size="caption"
          color={mutedText(ctx.t)}
          clamp={3}
          style={{ minWidth: 0 }}
        >
          {`${String(tasks.length)} tasks · low ${said(tasks.reduce((sum, task) => sum + task.low, 0))}, high ${said(tasks.reduce((sum, task) => sum + task.high, 0))}`}
        </T>
      )}
    </div>
  );
}
