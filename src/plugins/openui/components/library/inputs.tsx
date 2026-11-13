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

import type { JSX } from "react";
import { action, defineComponent } from "@openuidev/lang-core";
import {
  Button as AdwaitaButton,
  Checkbox,
  Entry,
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

import { mutedText } from "../../../core/lib/ui/theme";
import { HAIRLINE } from "../../../core/lib/ui/tokens";
import { innerGap, paneRadius, programEmphasisWeight } from "../../lib/tokens";
import {
  programButtonVariant,
  programTextColor,
  type ProgramTone,
} from "../../lib/theme";
import {
  choiceRunPosition,
  formPosition,
} from "../../lib/answer/positions";
import type { ProgramContext } from "./context";
import {
  ProgramFigureRow,
  listProp,
  prop,
  reactive,
  textProp,
} from "./context";
import { coerce } from "./coerce";

export const Button = defineComponent({
  name: "Button",
  description:
    "a button: its label, and what it does — @Set to change the page, @ToAssistant to ask the agent. With nothing to do it is a choice, and its label is the answer the human sends",
  props: z.object({
    label: z.string(),
    act: action().nullable().optional(),
    tone: z.string().nullable().optional(),
    disabled: z.boolean().nullable().optional(),
    icon: z.string().nullable().optional(),
  }),
  component: drawButton,
});

export const Form = defineComponent({
  name: "Form",
  description:
    "one question, asked as a block of fields: a title, then the inputs that answer it. The first edit stages every field as its own `Label: answer` line in the human's message — there is no submit button",
  props: z.object({
    title: z.string().nullable().optional(),
    children: z.array(z.any()),
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

export const Choice = defineComponent({
  name: "Choice",
  description: "one option picked from a short list of them",
  props: z.object({
    value: reactive(z.string()),
    options: z.array(z.union([z.string(), z.number()])),
    label: z.string().nullable().optional(),
  }),
  component: drawChoice,
});

export const Radio = defineComponent({
  name: "Radio",
  description:
    "one option picked from a vertical list of them, each with its own line",
  props: z.object({
    value: reactive(z.string()),
    options: z.array(z.union([z.string(), z.number()])),
    label: z.string().nullable().optional(),
  }),
  component: drawRadio,
});

export const Select = defineComponent({
  name: "Select",
  description: "one option picked from a long list of them, opened as a menu",
  props: z.object({
    value: reactive(z.string()),
    options: z.array(z.union([z.string(), z.number()])),
    label: z.string().nullable().optional(),
  }),
  component: drawSelect,
});

export const Checklist = defineComponent({
  name: "Checklist",
  description:
    "several options picked from a list of them: the $variable it holds is the list of what is ticked",
  props: z.object({
    values: reactive(z.array(z.string())),
    options: z.array(z.union([z.string(), z.number()])),
    label: z.string().nullable().optional(),
  }),
  component: drawChecklist,
});

export const Rating = defineComponent({
  name: "Rating",
  description: "how many of a number of marks: the $variable it holds, then how many there are",
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

export const Field = defineComponent({
  name: "Field",
  description: "a line of text the human types",
  props: z.object({
    value: reactive(z.string()),
    placeholder: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
  }),
  component: drawField,
});

export const TextArea = defineComponent({
  name: "TextArea",
  description: "several lines of text the human types",
  props: z.object({
    value: reactive(z.string()),
    placeholder: z.string().nullable().optional(),
    label: z.string().nullable().optional(),
    rows: z.number().nullable().optional(),
  }),
  component: drawTextArea,
});

export const Stepper = defineComponent({
  name: "Stepper",
  description: "a whole number the human raises or lowers",
  props: z.object({
    value: reactive(z.number()),
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    label: z.string().nullable().optional(),
  }),
  component: drawStepper,
});

/* ------------------------------------------------------------------ draws */

export function drawButton(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const label = textProp(node.props, "label");
  const tone = prop<ProgramTone | null>(node.props, "tone", null);
  const disabled = prop<boolean>(node.props, "disabled", false);
  const asks = prop<unknown>(node.props, "act", null) === null;

  // A button with nothing to do is a question: the run of them beside each other
  // is one question, and its answer is whichever label the human picked.
  if (!asks)
    return (
      <AdwaitaButton
        variant={programButtonVariant(tone)}
        size="sm"
        label={label}
        disabled={disabled}
        onClick={() => ctx.act(node.props.act, label)}
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
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
      <AdwaitaButton
        variant={picked ? "suggested" : programButtonVariant(tone)}
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
    <T size="caption" color={programTextColor(props.ctx.t, "muted")} clamp={2} style={{ minWidth: 0 }}>
      {props.text}
    </T>
  );
}

export function drawForm(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const title = textProp(node.props, "title");
  const position = formPosition(ctx.path);
  const sent = ctx.sentAnswer(position);
  const staged = ctx.staged(position);
  const closed = ctx.answered || sent !== "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: innerGap(ctx.t),
        padding: innerGap(ctx.t),
        borderWidth: HAIRLINE,
        borderColor: ctx.t.color.border.default,
        borderRadius: paneRadius(ctx.t),
      }}
    >
      {title === "" ? null : (
        <T size="list" weight={programEmphasisWeight(ctx.t)} color={ctx.t.color.text.primary} clamp={2} style={{ minWidth: 0 }}>
          {title}
        </T>
      )}
      {closed ? (
        <T size="caption" color={programTextColor(ctx.t, "muted")} clamp={6} style={{ minWidth: 0 }}>
          {sent === "" ? "sent" : sent}
        </T>
      ) : (
        ctx.nodes(node.props.children)
      )}
      {closed || staged === "" ? null : (
        <T size="caption" color={programTextColor(ctx.t, "muted")} clamp={2} style={{ minWidth: 0 }}>
          {"in your message — send it with your reply"}
        </T>
      )}
    </div>
  );
}

export function drawToggle(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, false);

  return (
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

/** The label a list of options stands under, when the program gave it one. */
function OptionsLabel(props: { ctx: ProgramContext; label: string }): JSX.Element | null {
  if (props.label === "") return null;
  return (
    <Label size="caption" variant="dim">
      {props.label}
    </Label>
  );
}

const optionsOf = (node: ElementNode): string[] =>
  listProp(node.props, "options").map((option) => String(option ?? ""));

export function drawChoice(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const options = optionsOf(node);
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, options[0] ?? "");

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
      <OptionsLabel ctx={ctx} label={label} />
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
            variant={option === binding.value ? "suggested" : "default"}
            size="sm"
            label={option}
            onClick={() => binding.set(option)}
          />
        ))}
      </div>
    </div>
  );
}

export function drawRadio(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const options = optionsOf(node);
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, options[0] ?? "");

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
      <OptionsLabel ctx={ctx} label={label} />
      <RadioGroup value={binding.value} onValueChange={(next: string) => binding.set(next)}>
        {options.map((option, index) => (
          <RadioGroupItem key={`r-${String(index)}`} value={option} label={option} />
        ))}
      </RadioGroup>
    </div>
  );
}

export function drawSelect(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const options = optionsOf(node);
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, options[0] ?? "");

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
      <OptionsLabel ctx={ctx} label={label} />
      <NativeSelect
        value={binding.value}
        options={options.map((option) => ({ value: option, label: option }))}
        onChange={(next: string) => binding.set(next)}
      />
    </div>
  );
}

export function drawChecklist(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const options = optionsOf(node);
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.values, [] as string[]);
  const held = coerce<string[]>(binding.value, []);

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
      <OptionsLabel ctx={ctx} label={label} />
      {options.map((option, index) => (
        <Checkbox
          key={`c-${String(index)}`}
          label={option}
          checked={held.includes(option)}
          onCheckedChange={(next: boolean) =>
            binding.set(next ? [...held, option] : held.filter((item) => item !== option))
          }
        />
      ))}
    </div>
  );
}

export function drawRating(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const max = Math.max(1, Math.round(prop<number>(node.props, "max", 5)));
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, 0);
  const current = Number.isFinite(binding.value) ? Math.round(binding.value) : 0;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
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
        <T size="caption" color={mutedText(ctx.t)} clamp={2} style={{ minWidth: 0 }}>
          {label}
        </T>
      )}
    </div>
  );
}

export function drawSliderInput(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const min = prop(node.props, "min", 0);
  const max = prop(node.props, "max", 100);
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, min);
  const current = Number.isFinite(binding.value) ? binding.value : min;

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
    </div>
  );
}

export function drawField(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, "");

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
      <OptionsLabel ctx={ctx} label={label} />
      <Entry
        value={binding.value}
        placeholder={textProp(node.props, "placeholder")}
        surface="control"
        onChange={(next: string) => binding.set(next)}
      />
    </div>
  );
}

export function drawTextArea(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, "");

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
      <OptionsLabel ctx={ctx} label={label} />
      <Textarea
        value={binding.value}
        placeholder={textProp(node.props, "placeholder")}
        rows={Math.max(2, Math.round(prop<number>(node.props, "rows", 3)))}
        onChange={(next: string) => binding.set(next)}
      />
    </div>
  );
}

export function drawStepper(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const min = prop<number | null>(node.props, "min", null) ?? 0;
  const max = prop<number | null>(node.props, "max", null) ?? 99;
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, min);
  const current = Number.isFinite(binding.value) ? binding.value : min;

  const step = (next: number): void => {
    binding.set(Math.max(min, Math.min(max, next)));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        minWidth: 0,
        gap: innerGap(ctx.t),
      }}
    >
      <AdwaitaButton
        variant="default"
        size="sm"
        label="−"
        disabled={current <= min}
        onClick={() => step(current - 1)}
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
        onClick={() => step(current + 1)}
      />
      {label === "" ? null : (
        <T size="caption" color={mutedText(ctx.t)} clamp={2} style={{ minWidth: 0 }}>
          {label}
        </T>
      )}
    </div>
  );
}
