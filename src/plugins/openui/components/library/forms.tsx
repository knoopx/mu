import {
  action,
  defineComponent,
  FormNameContext,
  FormValidationContext,
  reactive,
  useCreateFormValidation,
  useFormName,
  useFormValidation,
  useStateField,
  useTriggerAction,
} from "@openuidev/react-lang";
import type { ReactNode } from "react";
import { z } from "zod";
import {
  Button as AdwButton,
  Checkbox,
  Entry,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Heading as AdwHeading,
  Label as AdwLabel,
  NativeSelect,
  Switch,
  Textarea,
  type ButtonSize,
  type ButtonVariant,
  type EntryType,
  type LabelVariant,
  type NativeSelectOption,
} from "adwaita-gpuix";
import { TONE_TOKENS, type ToneToken } from "../../lib/tokens";

const LABEL_TONE: Record<ToneToken, LabelVariant> = {
  default: "default",
  muted: "dim",
  accent: "accent",
  success: "success",
  warning: "warning",
  destructive: "destructive",
};

const ENTRY_TYPE: Record<
  "text" | "email" | "number" | "password" | "tel" | "url",
  EntryType
> = {
  text: "text",
  email: "email",
  number: "number",
  password: "password",
  tel: "text",
  url: "url",
};

const BUTTON_VARIANT: Record<
  "primary" | "secondary" | "ghost",
  ButtonVariant
> = {
  primary: "suggested",
  secondary: "secondary",
  ghost: "text",
};

const BUTTON_SIZE: Record<"sm" | "default" | "lg", ButtonSize> = {
  sm: "sm",
  default: "default",
  lg: "lg",
};

function useFieldError(name: string): string | undefined {
  return useFormValidation()?.errors[name];
}

function FieldShell({
  label,
  error,
  children,
}: {
  label?: string;
  error: string | undefined;
  children: ReactNode;
}) {
  return (
    <Field style={{ width: "100%" }}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}


function useFieldBinding<T>(name: string, value: T) {
  const field = useStateField(name, value);
  return { ...field, error: useFieldError(name) };
}

function BoundField<T>({
  name,
  value,
  label,
  children,
}: {
  name: string;
  value: T;
  label?: string;
  children: (field: ReturnType<typeof useFieldBinding<T>>) => ReactNode;
}) {
  const field = useFieldBinding(name, value);
  return (
    <FieldShell label={label} error={field.error}>
      {children(field)}
    </FieldShell>
  );
}

export const Form = defineComponent({
  name: "Form",
  props: z.object({
    name: z
      .union([z.string(), z.array(z.any())])
      .optional()
      .describe('Form id that namespaces its field values: Form("login", [...]). A bare Form([...]) is fine too.'),
    children: z
      .union([z.array(z.any()), z.any()])
      .optional()
      .describe("Fields and their Buttons, in display order."),
    title: z
      .union([z.string(), z.array(z.any())])
      .optional()
      .describe("Heading rendered above the fields."),
  }),
  description:
    'Interactive form: Form("login", [Input("email", "Email"), CheckBox("remember", "Remember"), Buttons([Button("Sign in", "primary", @ToAssistant("Sign in"))])]). Every field shares one value store and is sent with the button.',
  component: ({ props, renderNode }) => {
    const validation = useCreateFormValidation();
    const formName = typeof props.name === "string" ? props.name : undefined;
    const heading = typeof props.title === "string" ? props.title : undefined;
    
    
    const collected = [props.name, props.children, props.title].flatMap((value) =>
      Array.isArray(value) ? value : [],
    );
    const isButtonRow = (node: unknown): boolean =>
      (node as { typeName?: string } | null)?.typeName === "Buttons";
    const fields = [
      ...collected.filter((node) => !isButtonRow(node)),
      ...collected.filter(isButtonRow),
    ];
    return (
      <FormNameContext.Provider value={formName}>
        <FormValidationContext.Provider value={validation}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              width: "100%",
            }}
          >
            {heading ? <AdwHeading level={3}>{heading}</AdwHeading> : null}
            <FieldGroup style={{ width: "100%" }}>
              {renderNode(fields)}
            </FieldGroup>
          </div>
        </FormValidationContext.Provider>
      </FormNameContext.Provider>
    );
  },
});

export const Label = defineComponent({
  name: "Label",
  props: z.object({
    text: z.string().describe("Caption text."),
    tone: z
      .enum(TONE_TOKENS)
      .optional()
      .describe('Colour tone; "muted" for secondary captions (default default).'),
  }),
  description:
    "Standalone text caption used to name a field or a group of fields; fields also take their own label prop.",
  component: ({ props }) => (
    <AdwLabel variant={LABEL_TONE[props.tone as ToneToken] ?? "default"}>
      {props.text}
    </AdwLabel>
  ),
});

export const Input = defineComponent({
  name: "Input",
  props: z.object({
    name: z
      .string()
      .describe("Field id; becomes the key of this value in the form state."),
    label: z.string().optional().describe("Caption above the entry."),
    placeholder: z.string().optional().describe("Hint shown while the field is empty."),
    type: z
      .enum(["text", "email", "number", "password", "tel", "url"])
      .optional()
      .describe('Kind of value (default "text"; "password" masks input).'),
    value: reactive(
      z
        .string()
        .optional()
        .describe(
          "Initial value, or a $var binding this field reads and writes.",
        ),
    ),
  }),
  description:
    "Single-line text entry whose value is stored under `name`; use type for email/number/password/url variants.",
  component: ({ props }) => (
    <BoundField name={props.name} value={props.value} label={props.label}>
      {(field) => (
        <Entry
          value={field.value ?? ""}
          placeholder={props.placeholder}
          type={ENTRY_TYPE[props.type as keyof typeof ENTRY_TYPE] ?? "text"}
          invalid={Boolean(field.error)}
          onChange={(next) => field.setValue(next)}
          style={{ width: "100%" }}
        />
      )}
    </BoundField>
  ),
});

export const TextArea = defineComponent({
  name: "TextArea",
  props: z.object({
    name: z.string().describe("Field id; becomes the key of this value in the form state."),
    label: z.string().optional().describe("Caption above the textarea."),
    placeholder: z.string().optional().describe("Hint shown while the field is empty."),
    rows: z
      .number()
      .int()
      .min(1)
      .max(24)
      .optional()
      .describe("Visible text lines (default 3)."),
    value: reactive(
      z
        .string()
        .optional()
        .describe(
          "Initial text, or a $var binding this field reads and writes.",
        ),
    ),
  }),
  description:
    "Multi-line text area bound to form state, for messages, notes and any long free text.",
  component: ({ props }) => (
    <BoundField name={props.name} value={props.value} label={props.label}>
      {(field) => (
        <Textarea
          value={field.value ?? ""}
          placeholder={props.placeholder}
          rows={props.rows ?? 3}
          invalid={Boolean(field.error)}
          onChange={(next) => field.setValue(next)}
          style={{ width: "100%" }}
        />
      )}
    </BoundField>
  ),
});

const SelectOption = z.object({
  label: z.string().describe("Text shown in the list."),
  value: z.string().optional().describe("Value stored when picked; defaults to the label."),
});

function selectOptions(options: unknown[]): NativeSelectOption[] {
  return options.map((option) => {
    if (option && typeof option === "object") {
      const raw = option as { label?: unknown; value?: unknown };
      const label = String(raw.label ?? raw.value ?? "");
      const value = String(raw.value ?? raw.label ?? "");
      return { label, value };
    }
    const text = String(option ?? "");
    return { label: text, value: text };
  });
}

export const Select = defineComponent({
  name: "Select",
  props: z.object({
    name: z.string().describe("Field id; becomes the key of this value in the form state."),
    label: z.string().optional().describe("Caption above the control."),
    options: z
      .array(z.union([z.string().describe("Option whose label and value are the same text."), SelectOption]))
      .describe("Choices in display order; a bare string is both label and value."),
    value: reactive(
      z
        .string()
        .optional()
        .describe(
          "Initially selected value, or a $var binding this field reads and writes.",
        ),
    ),
  }),
  description:
    "Dropdown picking one option from a fixed list; Select(\"size\", \"Size\", [\"S\", \"M\", \"L\"]).",
  component: ({ props }) => {
    const options = selectOptions(props.options ?? []);
    return (
      <BoundField name={props.name} value={props.value} label={props.label}>
        {(field) => (
          <NativeSelect
            value={field.value || options[0]?.value || ""}
            options={options}
            onChange={(next) => field.setValue(next)}
            style={{ width: "100%" }}
          />
        )}
      </BoundField>
    );
  },
});

export const CheckBox = defineComponent({
  name: "CheckBox",
  props: z.object({
    name: z.string().describe("Field id; becomes the key of this value in the form state."),
    label: z.string().describe("Text beside the box; tapping the text toggles it."),
    checked: reactive(
      z
        .boolean()
        .optional()
        .describe(
          "Initially ticked, or a $var binding this box reads and writes.",
        ),
    ),
  }),
  description: "Checkbox holding a boolean, for opt-ins and yes/no questions.",
  component: ({ props }) => {
    const field = useStateField(props.name, props.checked);
    return (
      <Field style={{ width: "100%" }}>
        <Checkbox
          checked={Boolean(field.value)}
          label={props.label}
          onCheckedChange={(next) => field.setValue(next)}
        />
      </Field>
    );
  },
});

export const SwitchField = defineComponent({
  name: "SwitchField",
  props: z.object({
    name: z.string().describe("Field id; becomes the key of this value in the form state."),
    label: z.string().describe("Text beside the switch."),
    checked: reactive(
      z
        .boolean()
        .optional()
        .describe(
          "Initially on, or a $var binding this switch reads and writes.",
        ),
    ),
  }),
  description:
    "Toggle switch for an on/off setting that applies immediately, e.g. dark mode or notifications.",
  component: ({ props }) => {
    const field = useStateField(props.name, props.checked);
    return (
      <Field orientation="horizontal" style={{ flexShrink: 0 }}>
        <Switch
          checked={Boolean(field.value)}
          label={props.label}
          onChange={(next) => field.setValue(next)}
        />
      </Field>
    );
  },
});

export const Button = defineComponent({
  name: "Button",
  props: z.object({
    label: z.string().describe("Text on the button; also the message sent when it is clicked."),
    variant: z
      .enum(["primary", "secondary", "ghost"])
      .optional()
      .describe('Visual weight: "primary" for the main action (default secondary).'),
    size: z
      .enum(["sm", "default", "lg"])
      .optional()
      .describe("Button height (default default)."),
    action: action()
      .optional()
      .describe(
        "Extra step to run on click, e.g. @OpenUrl(\"https://example.com\"). Omit to just send the field values to the assistant.",
      ),
  }),
  description:
    "Clickable action inside a Form: sends the label plus the current field values back to the assistant.",
  component: ({ props }) => {
    const triggerAction = useTriggerAction();
    const formName = useFormName();
    return (
      <AdwButton
        variant={BUTTON_VARIANT[props.variant ?? "secondary"]}
        size={BUTTON_SIZE[props.size ?? "default"]}
        label={props.label}
        onClick={() => {
          void triggerAction(props.label, formName, props.action);
        }}
      />
    );
  },
});

export const Buttons = defineComponent({
  name: "Buttons",
  props: z.object({
    children: z.array(z.any()).describe("Button components, in display order."),
  }),
  description:
    "Right-aligned row of buttons, used as the footer of a Form or an action row in a Card.",
  component: ({ props, renderNode }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 8,
        justifyContent: "flex-end",
        alignItems: "center",
        width: "100%",
      }}
    >
      {renderNode(props.children)}
    </div>
  ),
});
