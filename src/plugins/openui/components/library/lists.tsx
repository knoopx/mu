import { optionList } from "./options";
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
  ActionRow as AdwActionRow,
  BoxedList as AdwBoxedList,
  ButtonRow as AdwButtonRow,
  ComboRow as AdwComboRow,
  EntryRow as AdwEntryRow,
  ExpanderRow as AdwExpanderRow,
  SwitchRow as AdwSwitchRow,
  type IconName,
} from "adwaita-gpuix";


const icon = z
  .string()
  .optional()
  .describe('adwaita icon name at that edge, e.g. "globe", "circleDot", "chevronRight".');

const title = z.string().describe("Primary line — the name of the thing this row is about.");

const subtitle = z
  .string()
  .optional()
  .describe("Secondary line in dimmed text: the facts that qualify the title.");

const name = z
  .string()
  .describe("Field id holding this row's value; the $var bound to it, e.g. \"sort\" for $sort.");

const HIG =
  "Rows are one continuous stack; the row's own fill carries hover and selection. Depth ≤ 1: a row group never sits inside a panel, a pane, a card or another group.";

export const BoxedList = defineComponent({
  name: "BoxedList",
  props: z.object({
    children: z.array(z.any()).describe("The rows, in display order."),
    emptyLabel: z
      .string()
      .optional()
      .describe("In-place message when the list has no rows at all."),
  }),
  description:
    "The one sanctioned group: a panel of rows separated inside it, holding CONTROLS (entries, switches, combos, options) or the detail rows of a single object. No outer frame, no zebra, no nesting, never inside the navigation pane, never wrapping a list of data. BoxedList([SwitchRow(...), ComboRow(...), EntryRow(...)]). " +
    HIG,
  component: ({ props, renderNode }) => (
    <AdwBoxedList emptyLabel={props.emptyLabel} style={{ width: "100%" }}>
      {renderNode(props.children)}
    </AdwBoxedList>
  ),
});

export const RowList = defineComponent({
  name: "RowList",
  props: z.object({
    children: z.array(z.any()).describe("The rows, in display order."),
    gap: z
      .enum(["none", "xs", "s"])
      .optional()
      .describe("Space between rows (default \"none\" — rows read as one list)."),
  }),
  description:
    "A list of rows of data, flush on the view surface: no panel, no separators, no zebra, no tile per row. This is the primary list of a view — RowList([ActionRow(...), ActionRow(...)]). Controls belong in a BoxedList, data belongs here.",
  component: ({ props, renderNode }) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: props.gap === "xs" ? 4 : props.gap === "s" ? 6 : 0,
        width: "100%",
        borderWidth: 0,
      }}
    >
      {renderNode(props.children)}
    </div>
  ),
});

export const ActionRow = defineComponent({
  name: "ActionRow",
  props: z.object({
    title,
    subtitle,
    prefix: icon,
    suffix: icon,
    selected: z
      .boolean()
      .optional()
      .describe("Paint this row as the current selection (a tinted fill), e.g. $kind == \"Stock\"."),
    disabled: z.boolean().optional().describe("Grey it out and stop it responding."),
    action: action()
      .optional()
      .describe(
        "What the click does, e.g. @ToAssistant(\"Ask about this position\", {ticker: \"NVDA\"}). Omit to send the title as the message.",
      ),
  }),
  description:
    "A row that opens something: leading icon naming the object's kind, title, dimmed subtitle, trailing go-next chevron, and the row's own action on tap. Every repeating row carries the action for that item — a row with no action is a printout. Rows of data sit flush (RowList); only controls and one object's details go in a BoxedList. " +
    HIG,
  component: ({ props }) => {
    const triggerAction = useTriggerAction();
    const formName = useFormName();
    return (
      <AdwActionRow
        title={props.title}
        subtitle={props.subtitle}
        prefix={props.prefix as IconName | undefined}
        suffix={props.suffix as IconName | undefined}
        selected={Boolean(props.selected)}
        disabled={props.disabled}
        onClick={() => {
          void triggerAction(props.title, formName, props.action);
        }}
      />
    );
  },
});

export const EntryRow = defineComponent({
  name: "EntryRow",
  props: z.object({
    name,
    title,
    value: reactive(
      z.string().optional().describe("Current text, or a $var binding this row reads and writes."),
    ),
    placeholder: z.string().optional().describe("Hint shown while the entry is empty."),
  }),
  description:
    "Row with a text entry on its trailing edge, for editing one value in a control group. The entry reads and writes the field named in `name`. " +
    HIG,
  component: ({ props }) => {
    const field = useStateField(props.name, props.value);
    return (
      <AdwEntryRow
        title={props.title}
        value={String(field.value ?? "")}
        placeholder={props.placeholder}
        onChange={(next) => field.setValue(next)}
      />
    );
  },
});

export const SwitchRow = defineComponent({
  name: "SwitchRow",
  props: z.object({
    name,
    title,
    subtitle,
    checked: reactive(
      z.boolean().optional().describe("Currently on, or a $var binding this row reads and writes."),
    ),
    disabled: z.boolean().optional().describe("Grey it out and stop it responding."),
  }),
  description:
    "Row with a switch on its trailing edge, for a setting that applies immediately; the label names what changes. Legal only in a control group (a popover, a settings section) — never as a row of the navigation pane. " +
    HIG,
  component: ({ props }) => {
    const field = useStateField(props.name, props.checked);
    return (
      <AdwSwitchRow
        title={props.title}
        subtitle={props.subtitle}
        checked={Boolean(field.value)}
        disabled={props.disabled}
        onChange={(next) => field.setValue(next)}
      />
    );
  },
});

export const ComboRow = defineComponent({
  name: "ComboRow",
  props: z.object({
    name,
    title,
    value: reactive(
      z.string().optional().describe("The picked option, or a $var binding this row reads and writes."),
    ),
    options: z
      .array(
        z.union([
          z.string().describe("Option whose stored value is its label."),
          z.object({
            value: z.string().describe("Id stored when this option is picked."),
            label: z.string().describe("Text shown on the option."),
          }),
        ]),
      )
      .describe("The options, in the order they cycle."),
  }),
  description:
    "Row that picks one option out of several and shows the pick on its trailing edge; tapping cycles it. A filter/sort control belongs in the header bar (in a Popover), not in the navigation pane. " +
    HIG,
  component: ({ props }) => {
    const field = useStateField(props.name, props.value);
    const options = optionList(props.options);
    const labels = options.map((option) => option.label);
    const picked = options.find((option) => option.value === String(field.value));
    return (
      <AdwComboRow
        title={props.title}
        value={(picked ?? options[0])?.label ?? ""}
        options={labels}
        onChange={(next) => {
          const found = options.find((option) => option.label === next);
          field.setValue(found ? found.value : next);
        }}
      />
    );
  },
});

export const ExpanderRow = defineComponent({
  name: "ExpanderRow",
  props: z.object({
    title,
    subtitle,
    children: z.array(z.any()).describe("The rows revealed underneath, in order."),
  }),
  description:
    "Row that opens rows beneath it inside the same group — progressive disclosure for detail that does not fit on one line. Never an accordion of panels. " +
    HIG,
  component: ({ props, renderNode }) => (
    <AdwExpanderRow title={props.title} subtitle={props.subtitle}>
      {renderNode(props.children)}
    </AdwExpanderRow>
  ),
});

export const ButtonRow = defineComponent({
  name: "ButtonRow",
  props: z.object({
    title: z.string().describe("Text on the left: what the row is for."),
    label: z.string().describe("Verb on the right, e.g. \"Rename\", \"Forget\"."),
    destructive: z
      .boolean()
      .optional()
      .describe("Paint the verb in the destructive colour — it removes something."),
    disabled: z.boolean().optional().describe("Grey it out and stop it responding."),
    action: action()
      .optional()
      .describe("What the click does, e.g. @ToAssistant(\"Delete the file\"). Omit to send the title."),
  }),
  description:
    "Row whose whole width is one command, with the verb on its trailing edge; paint it destructive only when it removes something. " +
    HIG,
  component: ({ props }) => {
    const triggerAction = useTriggerAction();
    const formName = useFormName();
    return (
      <AdwButtonRow
        title={props.title}
        label={props.label}
        destructive={props.destructive}
        disabled={props.disabled}
        onClick={() => {
          void triggerAction(props.title, formName, props.action);
        }}
      />
    );
  },
});
