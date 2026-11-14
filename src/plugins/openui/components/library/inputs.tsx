/**
 * The input area of the language: the parts of a screen the human operates, and
 * the questions it asks them.
 *
 * Two rules, both taken from the reference implementation, decide what an input
 * does here.
 *
 * **An input that is not part of a form is a what-if.** It changes the page and
 * nothing else: dragging a slider is not a message, and a screen the human is
 * playing with does not fill a queue with every position of the handle. The
 * agent reads what a screen holds with `openui-state`, which reports the
 * `$variable` values as the human left them.
 *
 * **A question goes into the human's own message, and is never sent by itself.**
 * A Button with nothing to do is a choice, and its label is the answer; a Form
 * is one question whose fields answer it together. Either way the answer is
 * staged as a line in the draft the person is already typing, and reaches the
 * agent when they send. Once the reply has been answered the question closes:
 * the buttons fold into the line that went out.
 */

import type { JSX, ReactNode } from "react";
import { action, defineComponent } from "@openuidev/lang-core";
import {
  Button as AdwaitaButton,
  Checkbox,
  Entry,
  Icon as AdwaitaIcon,
  Label,
  NativeSelect,
  RadioGroup,
  RadioGroupItem,
  Slider as AdwaitaSlider,
  Switch as AdwaitaSwitch,
  T,
  Textarea,
} from "adwaita-gpuix";
import { z } from "zod/v4";

import type { ElementNode } from "@openuidev/lang-core";

import type { ButtonVariant } from "adwaita-gpuix";

import { mutedText } from "../../../core/lib/ui/theme";
import { HAIRLINE, INLINE_GLYPH } from "../../../core/lib/ui/tokens";
import { innerGap, paneRadius, programEmphasisWeight } from "../../lib/tokens";
import {
  programButtonVariant,
  programTextColor,
  toneOfValue,
  type ProgramTone,
} from "../../lib/theme";
import { choiceRunPosition, formPosition } from "../../lib/answer/positions";
import type { ProgramBinding, ProgramContext } from "./context";
import {
  ProgramColumn,
  ProgramFigureRow,
  listProp,
  programColumnStyle,
  programRowStyle,
  prop,
  reactive,
  textProp,
} from "./context";
import { coerce } from "./coerce";
import { resolveIcon } from "./content";
import { cellOf, cellText } from "./rows";

export const Button = defineComponent({
  name: "Button",
  description:
    "a button: its label, and what it does — @Set to change the page, @ToAssistant to ask the agent. With nothing to do it is a choice, and its label is the answer the human sends",
  props: z.object({
    label: z.string(),
    action: action().nullable().optional(),
    variant: z
      .enum(["primary", "secondary", "destructive"])
      .nullable()
      .optional(),
    icon: z.string().nullable().optional(),
    tone: z.string().nullable().optional(),
    disabled: z.boolean().nullable().optional(),
  }),
  component: drawButton,
});

/** What a button is asked to be: the one main action, an ordinary one, or the one that deletes. */
function buttonVariantOf(
  variant: unknown,
  tone: ProgramTone | null,
): ButtonVariant {
  if (variant === "primary") return "suggested";
  if (variant === "destructive") return "destructive";
  if (variant === "secondary") return "default";
  return programButtonVariant(tone);
}

export const Form = defineComponent({
  name: "Form",
  description:
    "the questions of a reply, in one block: the labelled inputs that answer them, and no submit button. The first edit stages every field as its own `Label: answer` line in the human's message, and they go when they send it",
  props: z.object({
    // The reference writes `Form([fields], "title")`; mu's programs wrote the
    // title first, like every other container here. Both orders are accepted —
    // whichever slot holds the list is the fields — and the drawer says which.
    children: z.union([z.array(z.any()), z.string()]),
    title: z.union([z.array(z.any()), z.string()]).nullable().optional(),
  }),
  component: drawForm,
});

export const Toggle = defineComponent({
  name: "Toggle",
  description:
    "a switch that turns one thing on or off: the $variable it holds, then its label",
  props: z.object({
    value: reactive(z.boolean()),
    label: z.string().nullable().optional(),
  }),
  component: drawToggle,
});

/** What a pick-one-of-these input is asked for: the `$variable` it holds, the options to pick between, and the word over them. */
const choiceProps = {
  value: reactive(z.string()),
  options: z.array(z.union([z.string(), z.number()])),
  label: z.string().nullable().optional(),
};

export const Choice = defineComponent({
  name: "Choice",
  description: "one option picked from a short list of them",
  props: z.object(choiceProps),
  component: drawChoice,
});

export const Radio = defineComponent({
  name: "Radio",
  description:
    "one option picked from a vertical list of them, each with its own line",
  props: z.object(choiceProps),
  component: drawRadio,
});

export const Select = defineComponent({
  name: "Select",
  description: "one option picked from a long list of them, opened as a menu",
  props: z.object(choiceProps),
  component: drawSelect,
});

export const Checklist = defineComponent({
  name: "Checklist",
  description:
    "several options picked from a list of them: the $variable it holds is the list of what is ticked, and starts as []",
  props: z.object({
    value: reactive(z.array(z.string())),
    options: z.array(z.any()),
    label: z.string().nullable().optional(),
  }),
  component: drawChecklist,
});

export const Rating = defineComponent({
  name: "Rating",
  description:
    "how many of a number of marks: the $variable it holds, then how many there are",
  props: z.object({
    value: reactive(z.number()),
    max: z.number().nullable().optional(),
    label: z.string().nullable().optional(),
  }),
  component: drawRating,
});

export const Slider = defineComponent({
  name: "Slider",
  description: "a number the human slides between a minimum and a maximum",
  props: z.object({
    value: reactive(z.number()),
    min: z.number(),
    max: z.number(),
    step: z.number().nullable().optional(),
    label: z.string().nullable().optional(),
  }),
  component: drawSliderInput,
});

export const Input = defineComponent({
  name: "Input",
  description: "a line of text the human types",
  props: z.object({
    value: reactive(z.string()),
    label: z.string().nullable().optional(),
    placeholder: z.string().nullable().optional(),
  }),
  component: drawInput,
});

export const TextArea = defineComponent({
  name: "TextArea",
  description: "several lines of text the human types",
  props: z.object({
    value: reactive(z.string()),
    label: z.string().nullable().optional(),
    placeholder: z.string().nullable().optional(),
    rows: z.number().nullable().optional(),
  }),
  component: drawTextArea,
});

export const Stepper = defineComponent({
  name: "Stepper",
  description:
    "a whole number the human raises or lowers — the control for a count they are trying out",
  props: z.object({
    value: reactive(z.number()),
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    /**
     * The stride. A word here is the caption a program wrote before a stride
     * existed in this slot, and the drawer reads it as one rather than failing
     * the statement — the same courtesy the retired names in `aliases.ts` get.
     */
    step: z.union([z.number(), z.string()]).nullable().optional(),
    label: z.string().nullable().optional(),
  }),
  component: drawStepper,
});

/**
 * A list of lines the human can add to and take away from.
 *
 * A what-if like every other input that is not a form field: it changes the
 * page, and the program reads `$items` to build whatever it is building.
 */
export const ListEditor = defineComponent({
  name: "ListEditor",
  description:
    "a list of short lines the human edits: the $variable it holds (a list of strings), its label, and what an empty line suggests",
  props: z.object({
    value: reactive(z.array(z.string())),
    label: z.string().nullable().optional(),
    placeholder: z.string().nullable().optional(),
  }),
  component: drawListEditor,
});

/** A date the human picks by typing it. */
export const DateInput = defineComponent({
  name: "DateInput",
  description: "one date the human types, as yyyy-mm-dd",
  props: z.object({
    value: reactive(z.string()),
    label: z.string().nullable().optional(),
  }),
  component: drawDateInput,
});

/** Options with more to them than a word: a title, a line, a mark, a picture. */
export const OptionCards = defineComponent({
  name: "OptionCards",
  description:
    "options with more to them than a word — {value, title?, detail?, image?, icon?}: a $variable holds the one picked, or several when it holds a list",
  props: z.object({
    value: reactive(z.any()),
    options: z.array(z.any()),
    label: z.string().nullable().optional(),
  }),
  component: drawOptionCards,
});

/** A row of colours the human can pick one of. */
export const Swatches = defineComponent({
  name: "Swatches",
  description:
    "a row of colours, as CSS colours or {value, name?}: with a $variable the human picks one",
  props: z.object({
    colors: z.array(z.any()),
    value: reactive(z.string()).nullable().optional(),
    label: z.string().nullable().optional(),
  }),
  component: drawSwatches,
});

/** A table the human edits in place, whose rows are the program's data. */
export const EditableTable = defineComponent({
  name: "EditableTable",
  description:
    "a table the human edits in place — the $variable holds a list of row objects, and the columns are keys or {key, label?, type?: text|number|boolean}; the right control for items with amounts",
  props: z.object({
    value: reactive(z.array(z.any())),
    columns: z.array(z.any()),
    label: z.string().nullable().optional(),
  }),
  component: drawEditableTable,
});

/** The questions the human is likely to ask next. */
export const FollowUps = defineComponent({
  name: "FollowUps",
  description:
    "the questions the human may want to ask next: a tap puts one in their message, and they send it when they are ready",
  props: z.object({
    prompts: z.array(z.any()),
  }),
  component: drawFollowUps,
});

/* ------------------------------------------------------------------ draws */

export function drawButton(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const label = textProp(node.props, "label");
  const tone = toneOfValue(node.props.tone);
  const disabled = prop<boolean>(node.props, "disabled", false);
  // The reference names the action prop `action`; mu's programs wrote `act`.
  const steps = node.props.action ?? node.props.act;
  const asks = steps === null || steps === undefined;
  const variant = buttonVariantOf(node.props.variant, tone);

  // A button with nothing to do is a question: the run of them beside each other
  // is one question, and its answer is whichever label the human picked.
  if (!asks)
    return (
      <AdwaitaButton
        variant={variant}
        size="sm"
        label={label}
        disabled={disabled}
        onClick={() => ctx.act(steps, label)}
      />
    );

  const position = choiceRunPosition(ctx.group);
  const sent = ctx.sentAnswer(position);
  const closed = ctx.answered || sent !== "";
  const answer = closed ? sent : ctx.staged(position);
  const picked = answer === label;

  if (closed && !picked) return <></>;
  if (closed) return <StagedNote ctx={ctx} text={`${label} — sent`} />;

  return (
    <div style={programRowStyle(ctx.t)}>
      <AdwaitaButton
        variant={picked ? "suggested" : variant}
        size="sm"
        label={label}
        disabled={disabled}
        onClick={() => ctx.stage(position, picked ? "" : label)}
      />
      {picked ? <StagedNote ctx={ctx} text="in your message" /> : null}
    </div>
  );
}

/** The line that says where an answer stands: staged in the draft, or gone out. */
function StagedNote(props: { ctx: ProgramContext; text: string }): JSX.Element {
  return (
    <T
      size="caption"
      color={programTextColor(props.ctx.t, "muted")}
      clamp={2}
      style={{ minWidth: 0 }}
    >
      {props.text}
    </T>
  );
}

export function drawForm(node: ElementNode, ctx: ProgramContext): JSX.Element {
  // A mu program wrote the title first: `Form("Which export?", [...])`. The
  // reference puts the fields in the first slot, and a string in that slot that
  // is not a title means the older order.
  const fields =
    Array.isArray(node.props.children) || node.props.children === undefined
      ? node.props.children
      : node.props.title;
  const title =
    Array.isArray(node.props.children) || node.props.children === undefined
      ? textProp(node.props, "title")
      : textProp(node.props, "children");
  const position = formPosition(ctx.path);
  const sent = ctx.sentAnswer(position);
  const staged = ctx.staged(position);
  const closed = ctx.answered || sent !== "";

  return (
    <div
      style={{
        ...programColumnStyle(ctx.t),
        padding: innerGap(ctx.t),
        borderWidth: HAIRLINE,
        borderColor: ctx.t.color.border.default,
        borderRadius: paneRadius(ctx.t),
      }}
    >
      {title === "" ? null : (
        <T
          size="list"
          weight={programEmphasisWeight(ctx.t)}
          color={ctx.t.color.text.primary}
          clamp={2}
          style={{ minWidth: 0 }}
        >
          {title}
        </T>
      )}
      {closed ? (
        <T
          size="caption"
          color={programTextColor(ctx.t, "muted")}
          clamp={6}
          style={{ minWidth: 0 }}
        >
          {sent === "" ? "sent" : sent}
        </T>
      ) : (
        ctx.nodes(fields)
      )}
      {closed || staged === "" ? null : (
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
  );
}

export function drawToggle(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, false);

  return (
    <div style={{ ...programRowStyle(ctx.t), width: "100%" }}>
      <T
        size="list"
        color={ctx.t.color.text.primary}
        clamp={2}
        style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
      >
        {label}
      </T>
      <AdwaitaSwitch
        checked={binding.value}
        onChange={(next: boolean) => binding.set(next)}
      />
    </div>
  );
}

/**
 * One input and the label it stands under.
 *
 * A `Choice`, a `Select`, a `Field`: the label is a dim caption when the program
 * gave one and nothing when it did not, and the control sits under it in the
 * column every input of the language shares. The label is part of the input,
 * not a caption above a widget, so a drawer that took the label and drew its own
 * column could put a different gap between the two than its neighbour has.
 */
function InputColumn(props: {
  ctx: ProgramContext;
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <div style={programColumnStyle(props.ctx.t)}>
      {props.label === "" ? null : (
        <Label size="caption" variant="dim">
          {props.label}
        </Label>
      )}
      {props.children}
    </div>
  );
}

/** One option of a choice input: what it is worth, and the line that explains it. */
interface ChoiceOption {
  value: string;
  detail: string;
}

/**
 * The options of a choice input, however they were written.
 *
 * The reference lets an option carry its own line — `Radio($scope, [{value:
 * "Current view", detail: "What the filters show"}])` — and a bare word or
 * number is an option with nothing to explain. Reading them as strings would
 * print `[object Object]` in the middle of a question, so they are read here.
 */
const OPTION_NAMES = ["value", "detail"] as const;

const optionsOf = (node: ElementNode): ChoiceOption[] =>
  listProp(node.props, "options").map((option) =>
    typeof option === "object" && option !== null && !Array.isArray(option)
      ? {
          value: cellText(cellOf(option, OPTION_NAMES, 0)),
          detail: cellText(cellOf(option, OPTION_NAMES, 1)),
        }
      : { value: cellText(option), detail: "" },
  );

/** One choice read the way every single-choice input reads it: the options, the one the human left picked, and the label over them. */
function choiceOf(
  node: ElementNode,
  ctx: ProgramContext,
): {
  options: ChoiceOption[];
  label: string;
  binding: ProgramBinding<string>;
} {
  const options = optionsOf(node);
  return {
    options,
    label: textProp(node.props, "label"),
    binding: ctx.binding(node.props.value, options[0]?.value ?? ""),
  };
}

export function drawChoice(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const { options, label, binding } = choiceOf(node, ctx);

  return (
    <InputColumn ctx={ctx} label={label}>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          minWidth: 0,
          gap: innerGap(ctx.t),
        }}
      >
        {options.map((option, index) => (
          <AdwaitaButton
            key={`o-${String(index)}`}
            variant={
              option.value === binding.value ? "suggested" : "default"
            }
            size="sm"
            label={option.value}
            onClick={() => binding.set(option.value)}
          />
        ))}
      </div>
    </InputColumn>
  );
}

export function drawRadio(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const { options, label, binding } = choiceOf(node, ctx);

  return (
    <InputColumn ctx={ctx} label={label}>
      <RadioGroup
        value={binding.value}
        onValueChange={(next: string) => binding.set(next)}
      >
        {options.map((option, index) => (
          <div key={`r-${String(index)}`} style={programColumnStyle(ctx.t)}>
            <RadioGroupItem value={option.value} label={option.value} />
            {option.detail === "" ? null : (
              <T
                size="caption"
                color={mutedText(ctx.t)}
                clamp={3}
                style={{ minWidth: 0 }}
              >
                {option.detail}
              </T>
            )}
          </div>
        ))}
      </RadioGroup>
    </InputColumn>
  );
}

export function drawSelect(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const { options, label, binding } = choiceOf(node, ctx);

  return (
    <InputColumn ctx={ctx} label={label}>
      <NativeSelect
        value={binding.value}
        options={options.map((option) => ({
          value: option.value,
          label: option.value,
        }))}
        onChange={(next: string) => binding.set(next)}
      />
    </InputColumn>
  );
}

export function drawChecklist(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const options = optionsOf(node);
  // The reference names the state `value`; mu's programs wrote `values`.
  const binding = ctx.binding(
    node.props.value ?? node.props.values,
    [] as string[],
  );
  const held = coerce<string[]>(binding.value, []);

  return (
    <InputColumn ctx={ctx} label={textProp(node.props, "label")}>
      {options.map((option, index) => (
        <div key={`c-${String(index)}`} style={programColumnStyle(ctx.t)}>
          <Checkbox
            label={option.value}
            checked={held.includes(option.value)}
            onCheckedChange={(next: boolean) =>
              binding.set(
                next
                  ? [...held, option.value]
                  : held.filter((item) => item !== option.value),
              )
            }
          />
          {option.detail === "" ? null : (
            <T
              size="caption"
              color={mutedText(ctx.t)}
              clamp={3}
              style={{ minWidth: 0 }}
            >
              {option.detail}
            </T>
          )}
        </div>
      ))}
    </InputColumn>
  );
}

export function drawRating(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const max = Math.max(1, Math.round(prop<number>(node.props, "max", 5)));
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, 0);
  const current = Number.isFinite(binding.value)
    ? Math.round(binding.value)
    : 0;

  return (
    <div style={programRowStyle(ctx.t)}>
      {Array.from({ length: max }, (_, index) => index + 1).map((mark) => (
        <AdwaitaButton
          key={`m-${String(mark)}`}
          variant={mark <= current ? "suggested" : "text"}
          size="sm"
          label={mark <= current ? "★" : "☆"}
          onClick={() => binding.set(mark === current ? 0 : mark)}
        />
      ))}
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
  );
}

export function drawSliderInput(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const min = prop(node.props, "min", 0);
  const max = prop(node.props, "max", 100);
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, min);
  const current = Number.isFinite(binding.value) ? binding.value : min;

  return (
    <ProgramColumn ctx={ctx}>
      <ProgramFigureRow
        ctx={ctx}
        label={label}
        figure={String(current)}
        labelSize="caption"
        labelColor={mutedText(ctx.t)}
      />
      <AdwaitaSlider
        value={current}
        min={min}
        max={max}
        step={prop<number | null>(node.props, "step", null) ?? 1}
        onValueChange={(next) => {
          const number = Array.isArray(next) ? (next[0] ?? min) : next;
          binding.set(number);
        }}
      />
    </ProgramColumn>
  );
}

export function drawInput(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const binding = ctx.binding(node.props.value, "");

  return (
    <InputColumn ctx={ctx} label={textProp(node.props, "label")}>
      <Entry
        value={binding.value}
        placeholder={textProp(node.props, "placeholder")}
        surface="control"
        onChange={(next: string) => binding.set(next)}
      />
    </InputColumn>
  );
}

/** What a `ListEditor` holds: the strings, however the program wrote them. */
const linesOf = (value: unknown): string[] =>
  coerce<string[]>(value, []).map((line) => String(line ?? ""));

export function drawListEditor(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const binding = ctx.binding(node.props.value, [] as string[]);
  const lines = linesOf(binding.value);
  const placeholder = textProp(node.props, "placeholder");
  const at = (index: number, next: string): void =>
    binding.set(lines.map((line, at) => (at === index ? next : line)));

  return (
    <InputColumn ctx={ctx} label={textProp(node.props, "label")}>
      {lines.map((line, index) => (
        <div
          key={`l-${String(index)}`}
          style={{ ...programRowStyle(ctx.t), alignItems: "center" }}
        >
          <div style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}>
            <Entry
              value={line}
              placeholder={placeholder}
              surface="control"
              onChange={(next: string) => at(index, next)}
            />
          </div>
          <AdwaitaButton
            variant="text"
            size="sm"
            label="−"
            onClick={() => binding.set(lines.filter((_, at) => at !== index))}
          />
        </div>
      ))}
      <AdwaitaButton
        variant="default"
        size="sm"
        label="+ add one"
        onClick={() => binding.set([...lines, ""])}
      />
    </InputColumn>
  );
}

export function drawDateInput(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const binding = ctx.binding(node.props.value, "");
  const held = String(binding.value ?? "");
  const shaped = /^\d{4}-\d{2}-\d{2}$/.test(held);

  return (
    <InputColumn ctx={ctx} label={textProp(node.props, "label")}>
      <Entry
        value={held}
        placeholder="yyyy-mm-dd"
        surface="control"
        onChange={(next: string) => binding.set(next)}
      />
      {held === "" || shaped ? null : (
        <T
          size="caption"
          color={programTextColor(ctx.t, "warning")}
          clamp={2}
          style={{ minWidth: 0 }}
        >
          {"not a date yet — yyyy-mm-dd"}
        </T>
      )}
    </InputColumn>
  );
}

const OPTION_CARD_NAMES = ["value", "title", "detail", "image", "icon"] as const;

export function drawOptionCards(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const options = listProp(node.props, "options");
  // One option, or several: the state says which, because the reference lets a
  // list `$variable` pick more than one card.
  const binding = ctx.binding<string | string[]>(node.props.value, "");
  const many = Array.isArray(binding.value);
  const pickedMany = coerce<string[]>(binding.value, []);
  const pickedOne = String(binding.value ?? "");
  const picked = (value: string): boolean =>
    many ? pickedMany.includes(value) : pickedOne === value;

  const choose = (value: string): void => {
    if (!many) {
      binding.set(value);
      return;
    }
    binding.set(
      pickedMany.includes(value)
        ? pickedMany.filter((item) => item !== value)
        : [...pickedMany, value],
    );
  };

  return (
    <InputColumn ctx={ctx} label={textProp(node.props, "label")}>
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
        {options.map((option, index) => {
          const named = typeof option === "object" && option !== null && !Array.isArray(option);
          const value = named
            ? cellText(cellOf(option, OPTION_CARD_NAMES, 0))
            : cellText(option);
          const title = named
            ? (cellText(cellOf(option, OPTION_CARD_NAMES, 1)) || value)
            : value;
          const detail = named ? cellText(cellOf(option, OPTION_CARD_NAMES, 2)) : "";
          const mark = named ? resolveIcon(cellText(cellOf(option, OPTION_CARD_NAMES, 4))) : "";
          const on = picked(value);

          return (
            <div
              key={`oc-${String(index)}`}
              onClick={() => choose(value)}
              style={{
                ...programColumnStyle(ctx.t),
                flexGrow: 1,
                flexBasis: 160,
                minWidth: 0,
                padding: innerGap(ctx.t),
                borderRadius: ctx.t.radius.sm,
                borderWidth: HAIRLINE,
                borderColor: on ? ctx.t.color.accent.base : ctx.t.color.border.default,
                backgroundColor: on
                  ? ctx.t.color.surface.sunken
                  : "transparent",
                cursor: "pointer",
              }}
            >
              <div style={{ ...programRowStyle(ctx.t), alignItems: "center" }}>
                {mark === "" ? null : (
                  <AdwaitaIcon
                    name={mark}
                    size={INLINE_GLYPH}
                    color={on ? ctx.t.color.accent.base : mutedText(ctx.t)}
                    style={{ flexShrink: 0 }}
                  />
                )}
                <T
                  size="list"
                  weight={programEmphasisWeight(ctx.t)}
                  color={ctx.t.color.text.primary}
                  clamp={2}
                  style={{ minWidth: 0 }}
                >
                  {title}
                </T>
                {on ? (
                  <AdwaitaIcon
                    name="check"
                    size={INLINE_GLYPH}
                    color={ctx.t.color.accent.base}
                    style={{ flexShrink: 0 }}
                  />
                ) : null}
              </div>
              {detail === "" || detail === title ? null : (
                <T
                  size="caption"
                  color={mutedText(ctx.t)}
                  clamp={4}
                  style={{ minWidth: 0 }}
                >
                  {detail}
                </T>
              )}
            </div>
          );
        })}
      </div>
    </InputColumn>
  );
}

/** One swatch: the colour, and the name the program gave it. */
const swatchOf = (color: unknown): { value: string; name: string } =>
  typeof color === "object" && color !== null && !Array.isArray(color)
    ? {
        value: cellText(cellOf(color, ["value", "name"], 0)),
        name: cellText(cellOf(color, ["value", "name"], 1)),
      }
    : { value: cellText(color), name: "" };

/** Is this CSS colour word something the screen can fill with? */
const colorFill = (value: string): string | null =>
  /^#[0-9a-fA-F]{3,8}$/.test(value.trim())
    ? value.trim()
    : /^rgba?\(/.test(value.trim())
      ? value.trim()
      : null;

export function drawSwatches(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const colors = listProp(node.props, "colors").map(swatchOf);
  const bound = node.props.value;
  const binding =
    bound === null || bound === undefined
      ? null
      : ctx.binding(bound, colors[0]?.value ?? "");
  const current = binding === null ? "" : String(binding.value ?? "");

  return (
    <InputColumn ctx={ctx} label={textProp(node.props, "label")}>
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
        {colors.map((color, index) => {
          const fill = colorFill(color.value) ?? ctx.t.color.surface.sunken;
          const on = color.value === current;
          return (
            <div
              key={`s-${String(index)}`}
              onClick={() => binding?.set(color.value)}
              style={{
                ...programColumnStyle(ctx.t),
                minWidth: 0,
                gap: 0,
                cursor: binding === null ? undefined : "pointer",
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: ctx.t.radius.sm,
                  backgroundColor: fill,
                  borderWidth: HAIRLINE,
                  borderColor: on ? ctx.t.color.accent.base : ctx.t.color.border.default,
                }}
              />
              {color.name === "" ? null : (
                <T
                  size="caption"
                  color={on ? ctx.t.color.text.primary : mutedText(ctx.t)}
                  clamp={1}
                  style={{ minWidth: 0 }}
                >
                  {color.name}
                </T>
              )}
            </div>
          );
        })}
      </div>
    </InputColumn>
  );
}

/** One column of an `EditableTable`, however the program wrote it. */
interface EditColumn {
  key: string;
  label: string;
  type: "text" | "number" | "boolean";
}

const EDIT_COLUMN_NAMES = ["key", "label", "type"] as const;

const editColumnsOf = (columns: readonly unknown[]): EditColumn[] =>
  columns.map((column) => {
    if (typeof column !== "object" || column === null || Array.isArray(column)) {
      const key = cellText(column);
      return { key, label: key, type: "text" };
    }
    const key = cellText(cellOf(column, EDIT_COLUMN_NAMES, 0));
    const label = cellText(cellOf(column, EDIT_COLUMN_NAMES, 1)) || key;
    const word = cellText(cellOf(column, EDIT_COLUMN_NAMES, 2));
    return {
      key,
      label,
      type: word === "number" ? "number" : word === "boolean" ? "boolean" : "text",
    };
  });

export function drawEditableTable(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const binding = ctx.binding(node.props.value, [] as Record<string, unknown>[]);
  const rows = coerce<Record<string, unknown>[]>(binding.value, []);
  const columns = editColumnsOf(listProp(node.props, "columns"));
  const label = textProp(node.props, "label");

  const write = (index: number, key: string, next: unknown): void =>
    binding.set(
      rows.map((row, at) =>
        at === index ? { ...(row ?? {}), [key]: next } : (row ?? {}),
      ),
    );

  const cellOfRow = (row: unknown, column: EditColumn): unknown =>
    typeof row === "object" && row !== null
      ? (row as Record<string, unknown>)[column.key]
      : undefined;

  return (
    <InputColumn ctx={ctx} label={label}>
      <div style={programColumnStyle(ctx.t)}>
        {rows.map((row, index) => (
          <div
            key={`e-${String(index)}`}
            style={{ ...programRowStyle(ctx.t), alignItems: "center" }}
          >
            {columns.map((column, at) => (
              <div
                key={`ec-${String(at)}`}
                style={{ flexGrow: 1, flexBasis: 0, minWidth: 0 }}
              >
                {column.type === "boolean" ? (
                  <Checkbox
                    label={column.label}
                    checked={cellOfRow(row, column) === true}
                    onCheckedChange={(next: boolean) =>
                      write(index, column.key, next)
                    }
                  />
                ) : (
                  <Entry
                    value={String(cellOfRow(row, column) ?? "")}
                    placeholder={column.label}
                    surface="control"
                    onChange={(next: string) =>
                      write(
                        index,
                        column.key,
                        column.type === "number"
                          ? Number.parseFloat(next.replace(/[^0-9.\-]/g, "")) || 0
                          : next,
                      )
                    }
                  />
                )}
              </div>
            ))}
            <AdwaitaButton
              variant="text"
              size="sm"
              label="−"
              onClick={() => binding.set(rows.filter((_, at) => at !== index))}
            />
          </div>
        ))}
      </div>
      <AdwaitaButton
        variant="default"
        size="sm"
        label="+ add a row"
        onClick={() =>
          binding.set([
            ...rows,
            Object.fromEntries(
              columns.map((column) => [column.key, column.type === "number" ? 0 : column.type === "boolean" ? false : ""]),
            ),
          ])
        }
      />
    </InputColumn>
  );
}

export function drawFollowUps(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const prompts = listProp(node.props, "prompts").map(cellText);
  const position = choiceRunPosition(ctx.path);
  const sent = ctx.sentAnswer(position);
  const staged = ctx.staged(position);
  const closed = ctx.answered || sent !== "";
  const answer = closed ? sent : staged;

  if (closed)
    return (
      <T
        size="caption"
        color={programTextColor(ctx.t, "muted")}
        clamp={3}
        style={{ minWidth: 0 }}
      >
        {sent === "" ? "sent" : sent}
      </T>
    );

  return (
    <div style={{ ...programRowStyle(ctx.t), flexWrap: "wrap" }}>
      {prompts.map((prompt, index) => (
        <AdwaitaButton
          key={`f-${String(index)}`}
          variant={prompt === answer ? "suggested" : "default"}
          size="sm"
          label={prompt}
          onClick={() => ctx.stage(position, prompt === answer ? "" : prompt)}
        />
      ))}
      {answer === "" ? null : (
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
  );
}

export function drawTextArea(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const binding = ctx.binding(node.props.value, "");

  return (
    <InputColumn ctx={ctx} label={textProp(node.props, "label")}>
      <Textarea
        value={binding.value}
        placeholder={textProp(node.props, "placeholder")}
        rows={Math.max(2, Math.round(prop<number>(node.props, "rows", 3)))}
        onChange={(next: string) => binding.set(next)}
      />
    </InputColumn>
  );
}

export function drawStepper(
  node: ElementNode,
  ctx: ProgramContext,
): JSX.Element {
  const min = prop<number | null>(node.props, "min", null) ?? 0;
  const max = prop<number | null>(node.props, "max", null) ?? 99;
  const written = node.props.step;
  const label =
    typeof written === "string"
      ? written.trim()
      : textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, min);
  const current = Number.isFinite(binding.value) ? binding.value : min;

  const stride = Math.max(
    1,
    Math.abs(typeof written === "number" ? written : 1),
  );
  const step = (next: number): void => {
    binding.set(Math.max(min, Math.min(max, next)));
  };

  return (
    <div style={programRowStyle(ctx.t)}>
      <AdwaitaButton
        variant="default"
        size="sm"
        label="−"
        disabled={current <= min}
        onClick={() => step(current - stride)}
      />
      <T
        size="list"
        weight={programEmphasisWeight(ctx.t)}
        color={ctx.t.color.text.primary}
        clamp={1}
        style={{ minWidth: 0 }}
      >
        {String(current)}
      </T>
      <AdwaitaButton
        variant="default"
        size="sm"
        label="+"
        disabled={current >= max}
        onClick={() => step(current + stride)}
      />
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
  );
}
