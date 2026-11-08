/**
 * The input area of the language: the parts of a screen the human operates.
 *
 * An input is bound to a `$variable`, so a program keeps its own state and
 * works without another message — and every change is reported to the program's
 * queue, because the agent has to be able to read what the human did with it.
 */

import type { JSX } from "react";
import { action, defineComponent, markReactive } from "@openuidev/lang-core";
import {
  Button as AdwaitaButton,
  Entry,
  Label,
  Slider as AdwaitaSlider,
  Switch as AdwaitaSwitch,
  T,
} from "adwaita-gpuix";
import { z } from "zod/v4";

import type { ElementNode } from "@openuidev/lang-core";

import { mutedText } from "../../../core/lib/ui/theme";
import { innerGap, programEmphasisWeight } from "../../lib/tokens";
import { programButtonVariant, type ProgramTone } from "../../lib/theme";
import type { ProgramContext } from "./context";
import { ProgramFigureRow, listProp, prop, textProp } from "./context";

/** Mark a prop reactive: the parser then lets a `$variable` bind to it. */
const reactive = <T extends z.ZodType>(schema: T): T => {
  markReactive(schema);
  return schema;
};

export const Button = defineComponent({
  name: "Button",
  description:
    "a button: its label and what it does — @Set to change the page, @ToAssistant to ask the agent",
  props: z.object({
    label: z.string(),
    act: action(),
    tone: z.string().nullable().optional(),
    disabled: z.boolean().nullable().optional(),
    icon: z.string().nullable().optional(),
  }),
  component: drawButton,
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

  return (
    <AdwaitaButton
      variant={programButtonVariant(tone)}
      size="sm"
      label={label}
      disabled={prop<boolean>(node.props, "disabled", false)}
      onClick={() => ctx.act(node.props.act, label)}
    />
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
        onChange={(next: boolean) => {
          binding.set(next);
          ctx.fire({
            type: "switch",
            message: `${label === "" ? binding.name : label}: ${next ? "on" : "off"}`,
            params: { variable: binding.name, value: next },
            formState: ctx.formState(),
          });
        }}
      />
    </div>
  );
}

export function drawChoice(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const options = listProp(node.props, "options").map((option) =>
    String(option ?? ""),
  );
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
      {label === "" ? null : (
        <Label size="caption" variant="dim">
          {label}
        </Label>
      )}
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
            onClick={() => {
              binding.set(option);
              ctx.fire({
                type: "selection",
                message: option,
                params: { variable: binding.name, value: option },
                formState: ctx.formState(),
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function drawSliderInput(node: ElementNode, ctx: ProgramContext): JSX.Element {
  const min = prop(node.props, "min", 0);
  const max = prop(node.props, "max", 100);
  const label = textProp(node.props, "label");
  const binding = ctx.binding(node.props.value, min);

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
        figure={String(binding.value)}
        labelSize="caption"
        labelColor={mutedText(ctx.t)}
      />
      <AdwaitaSlider
        value={binding.value}
        min={min}
        max={max}
        step={prop<number | null>(node.props, "step", null) ?? 1}
        onValueChange={(next) => {
          const number = Array.isArray(next) ? (next[0] ?? min) : next;
          binding.set(number);
          ctx.fire({
            type: "slider",
            message: `${label === "" ? binding.name : label}: ${String(number)}`,
            params: { variable: binding.name, value: number },
            formState: ctx.formState(),
          });
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
      {label === "" ? null : (
        <Label size="caption" variant="dim">
          {label}
        </Label>
      )}
      <Entry
        value={binding.value}
        placeholder={textProp(node.props, "placeholder")}
        surface="control"
        onChange={(next: string) => {
          binding.set(next);
        }}
        onSubmit={() =>
          ctx.fire({
            type: "input",
            message: `${label === "" ? binding.name : label}: ${binding.value}`,
            params: { variable: binding.name, value: binding.value },
            formState: ctx.formState(),
          })
        }
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

  const step = (next: number, direction: string) => {
    const clamped = Math.max(min, Math.min(max, next));
    binding.set(clamped);
    ctx.fire({
      type: "selection",
      message: `${label === "" ? binding.name : label}: ${String(clamped)} (${direction})`,
      params: { variable: binding.name, value: clamped },
      formState: ctx.formState(),
    });
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
        onClick={() => step(current - 1, "less")}
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
        onClick={() => step(current + 1, "more")}
      />
      {label === "" ? null : (
        <T size="caption" color={mutedText(ctx.t)} clamp={2} style={{ minWidth: 0 }}>
          {label}
        </T>
      )}
    </div>
  );
}
