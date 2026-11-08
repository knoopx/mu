import { choiceCells, optionList } from "./options";
import {
  action,
  defineComponent,
  reactive,
  useFormName,
  useTriggerAction,
  useStateField,
} from "@openuidev/react-lang";
import { z } from "zod";
import {
  Button as AdwButton,
  DatePicker as AdwDatePicker,
  Field,
  FieldLabel,
  RadioGroup as AdwRadioGroup,
  RadioGroupItem,
  Slider as AdwSlider,
  ICONS,
  T,
  ToggleGroup,
  useAdwaita,
  type IconName,
} from "adwaita-gpuix";



const choice = z.union([
  z.string(),
  z.object({
    value: z.string().describe("Value stored when this choice is picked."),
    label: z.string().describe("Text shown on the choice."),
  }),
]);




const SLIDER_TRACK_WIDTH = 150;

const SLIDER_READOUT_WIDTH = 56;

const ICON_NAMES = new Set(Object.keys(ICONS));

export const IconButton = defineComponent({
  name: "IconButton",
  props: z.object({
    icon: z.string().describe('adwaita icon name, e.g. "plus", "search", "trash".'),
    label: z
      .string()
      .describe("Short verb describing what it does; sent to the assistant on click."),
    action: action()
      .optional()
      .describe('Optional step, e.g. @ToAssistant("Delete the item").'),
    variant: z
      .enum(["primary", "secondary", "ghost"])
      .optional()
      .describe('Visual weight (default "ghost").'),
  }),
  description:
    "Icon-only button for a single action in a toolbar or a row: plus, search, refresh, trash.",
  component: ({ props }) => {
    const triggerAction = useTriggerAction();
    const formName = useFormName();
    return (
      <AdwButton
        icon={(ICON_NAMES.has(props.icon) ? props.icon : "circle") as IconName}
        variant={
          props.variant === "primary"
            ? "suggested"
            : props.variant === "ghost"
              ? "text"
              : "secondary"
        }
        onClick={() => {
          void triggerAction(props.label, formName, props.action);
        }}
      >
        {""}
      </AdwButton>
    );
  },
});

export const SegmentedControl = defineComponent({
  name: "SegmentedControl",
  props: z.object({
    name: z.string().describe("Field id holding the picked value."),
    options: z
      .array(choice)
      .describe("Two to four short choices as strings or {value, label}."),
    value: reactive(
      z.string().optional().describe("Initially picked option, or a $var binding."),
    ),
  }),
  description:
    "One pick out of two to four options, shown as a joined row of segments.",
  component: ({ props }) => {
    const field = useStateField(props.name, props.value);
    const options = choiceCells(props.options);
    return (
      <ToggleGroup
        options={options}
        value={String(field.value ?? options[0]?.id ?? "")}
        onChange={(id) => field.setValue(id)}
      />
    );
  },
});

export const Slider = defineComponent({
  name: "Slider",
  props: z.object({
    name: z.string().describe("Field id holding the number."),
    min: z.number().describe("Lowest value."),
    max: z.number().describe("Highest value."),
    step: z.number().optional().describe("Increment (default 1)."),
    label: z.string().optional().describe("Label above the slider."),
    unit: z
      .string()
      .optional()
      .describe('Suffix for the read-out, e.g. "%" or " px".'),
    value: reactive(
      z.number().optional().describe("Initial value, or a $var binding."),
    ),
  }),
  description:
    "Draggable number with a live read-out; use for volume, opacity, size or quantity.",
  component: ({ props }) => {
    const t = useAdwaita();
    const field = useStateField(props.name, props.value);
    const current =
      typeof field.value === "number" ? field.value : (props.min ?? 0);
    return (
      <Field orientation="horizontal" style={{ flexShrink: 0 }}>
        {props.label ? <FieldLabel>{props.label}</FieldLabel> : null}
        <AdwSlider
          value={current}
          min={props.min}
          max={props.max}
          step={props.step ?? 1}
          width={SLIDER_TRACK_WIDTH}
          onValueChange={(next) =>
            field.setValue(Array.isArray(next) ? next[0] : next)
          }
        />
        <T
          size="body"
          color={t.color.text.dim}
          style={{ minWidth: SLIDER_READOUT_WIDTH, textAlign: "right" }}
        >
          {`${Math.round(current * 100) / 100}${props.unit ?? ""}`}
        </T>
      </Field>
    );
  },
});

export const RadioGroup = defineComponent({
  name: "RadioGroup",
  props: z.object({
    name: z.string().describe("Field id holding the picked value."),
    label: z.string().optional().describe("Question above the options."),
    options: z.array(choice).describe("Options as strings or {value, label}."),
    value: reactive(
      z.string().optional().describe("Initially picked option, or a $var binding."),
    ),
  }),
  description:
    "One pick from a vertical list of options, each with its own row; better than a Select when the options need explaining.",
  component: ({ props }) => {
    const field = useStateField(props.name, props.value);
    return (
      <Field style={{ width: "100%" }}>
        {props.label ? <FieldLabel>{props.label}</FieldLabel> : null}
        <AdwRadioGroup
          value={String(field.value ?? "")}
          onValueChange={(next) => field.setValue(next)}
        >
          {optionList(props.options).map((entry) => (
            <RadioGroupItem
              key={entry.value}
              value={entry.value}
              label={entry.label}
            />
          ))}
        </AdwRadioGroup>
      </Field>
    );
  },
});

export const DatePicker = defineComponent({
  name: "DatePicker",
  props: z.object({
    name: z.string().describe("Field id holding an ISO date, e.g. \"2026-11-04\"."),
    label: z.string().optional().describe("Label above the control."),
    value: reactive(
      z.string().optional().describe("Initially selected date, or a $var binding."),
    ),
  }),
  description:
    "Month calendar for picking one day; the field value is the ISO date.",
  component: ({ props }) => {
    const field = useStateField(props.name, props.value);
    const current =
      typeof field.value === "string" && field.value ? new Date(field.value) : new Date();
    return (
      <Field style={{ width: "100%" }}>
        {props.label ? <FieldLabel>{props.label}</FieldLabel> : null}
        <AdwDatePicker
          value={Number.isNaN(current.getTime()) ? new Date() : current}
          onChange={(date) => field.setValue(date.toISOString().slice(0, 10))}
        />
      </Field>
    );
  },
});
