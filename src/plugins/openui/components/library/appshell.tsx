import { choiceCells, pickedId } from "./options";
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
  HeaderBar as AdwHeaderBar,
  T,
  Kbd as AdwKbd,
  KbdCombo,
  Pagination as AdwPagination,
  ShortcutHint,
  Sidebar as AdwSidebar,
  SidebarGroupLabel,
  SidebarMenuItem,
  StatusBar as AdwStatusBar,
  Tabs as AdwTabs,
  ViewSwitcher as AdwViewSwitcher,
  useAdwaita,
  type IconName,
  type Shortcut,
} from "adwaita-gpuix";


type KbdCode = string | string[];


const icon = z
  .string()
  .optional()
  .describe('adwaita icon name, e.g. "list", "layers", "globe", "refresh".');

const name = z
  .string()
  .describe("Field id holding the picked id; the $var bound to it, e.g. \"view\" for $view.");

const choice = z.union([
  z.string().describe("Id and label are the same text."),
  z.object({
    value: z.string().describe("Id stored when this entry is picked."),
    label: z.string().describe("Text shown on the entry."),
    icon: z.string().optional().describe('Leading icon, e.g. "list", "layers".'),
  }),
]);


const keyList = z
  .array(z.union([z.string().describe("One key, e.g. \"k\"."), z.array(z.string()).describe("A chord, e.g. [\"ctrl\", \"k\"].")]))
  .describe("The bindings, e.g. [\"ctrl\", \"k\"] for one chord, or [\"j\", \"k\"] for two keys.");

export const HeaderBar = defineComponent({
  name: "HeaderBar",
  props: z.object({
    title: z.string().describe("The one centred title of the window — the name of the open object."),
    subtitle: z.string().optional().describe("Dimmed line under the title, e.g. a path or a date."),
    left: z.array(z.any()).optional().describe("Left actions and the view switcher, in order."),
    right: z.array(z.any()).optional().describe("Right actions, in order — flat buttons sized to content."),
  }),
  description:
    "The header bar: one centred title (the open object), flat verbs sized to content in the two side slots, one row, 47px, no second row, never scrolling. THE header bar carries the verbs of the whole view: filter, sort, view switch, search, add, refresh, edit, delete. `left` = the view switcher and the creating verbs; `right` = the object's verbs, then the menu, then close. The content area gets no title of its own.",
  component: ({ props, renderNode }) => {
    const { color } = useAdwaita();
    return (
    <AdwHeaderBar
      centerMode="title"
      center={
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <T size="title3" weight={600} color={color.text.primary}>
            {props.title}
          </T>
          {props.subtitle ? (
            <T size="micro" color={color.text.dim}>
              {props.subtitle}
            </T>
          ) : null}
        </div>
      }
      left={renderNode(props.left ?? [])}
      right={renderNode(props.right ?? [])}
      style={{ width: "100%" }}
    />
    );
  },
});

export const ViewSwitcher = defineComponent({
  name: "ViewSwitcher",
  props: z.object({
    items: z.array(choice).describe("The views, in order: 2 to 4 short names, each with an icon."),
    name,
    value: reactive(
      z.string().optional().describe("The open view, or a $var binding it reads and writes."),
    ),
  }),
  description:
    "The joined pill group that switches what the window shows: 2 to 4 views, the active segment a tinted fill, never an outline. Put it in the header bar, bind it to a $var, and let that $var drive the content. Where a navigation pane lists places, the pane is not a second copy of this switch.",
  component: ({ props }) => {
    const field = useStateField(props.name, props.value);
    const cells = choiceCells(props.items, "list");
    return (
      <AdwViewSwitcher
        items={cells}
        value={pickedId(cells, field.value)}
        onChange={(id) => field.setValue(id)}
      />
    );
  },
});

export const Sidebar = defineComponent({
  name: "Sidebar",
  props: z.object({
    children: z.array(z.any()).describe("Its rows and groups, top to bottom."),
    width: z
      .number()
      .optional()
      .describe("Width in px (default CONTROL.sidebarWidth 220)."),
  }),
  description:
    "The navigation pane: a distinct surface 220px wide, flush to the window edges with square corners, separated from the primary pane by fill. It lists PLACES AND OBJECTS ONLY — SidebarItem rows, a human section label, its own search entry. No switch, combo, slider, checkbox, stepper, button, panel or boxed group inside it.",
  component: ({ props, renderNode }) => {
    const t = useAdwaita();
    return (
      <AdwSidebar
        width={props.width ?? t.control.sidebarWidth}
        style={{ borderRadius: 0, minWidth: 0 }}
      >
        {renderNode(props.children)}
      </AdwSidebar>
    );
  },
});

export const SidebarItem = defineComponent({
  name: "SidebarItem",
  props: z.object({
    label: z.string().describe("Name of the place, in the human's words — \"Positions\", not \"items\"."),
    name,
    value: z
      .string()
      .optional()
      .describe("The value written to the field when it is picked (default the label)."),
    icon,
    disabled: z.boolean().optional().describe("Grey it out and stop it responding."),
    action: action()
      .optional()
      .describe("Extra step on top of setting the value, e.g. @ToAssistant(\"Open the archive\")."),
  }),
  description:
    "One row of the navigation pane: leading icon, the place's name, a tinted fill while it is current. Picking it writes its value to the bound field, so the view changes with it. Rows are 40px, never boxed, never separated by rules, and carry no control of their own.",
  component: ({ props }) => {
    const triggerAction = useTriggerAction();
    const formName = useFormName();
    const field = useStateField<string>(props.name, undefined);
    const picked = props.value ?? props.label;
    const selected = String(field.value ?? "") === String(picked);
    return (
      <SidebarMenuItem
        label={props.label}
        icon={props.icon as IconName | undefined}
        selected={selected}
        disabled={props.disabled}
        onClick={() => {
          field.setValue(picked);
          if (props.action) void triggerAction(props.label, formName, props.action);
        }}
      />
    );
  },
});

export const SidebarLabel = defineComponent({
  name: "SidebarLabel",
  props: z.object({
    label: z.string().describe("The section's name in the human's words, e.g. \"Favorites\"."),
    icon,
  }),
  description:
    "A dimmed caption naming one group of navigation rows. Legal only for a human section; a group needs no label when its rows already say where they are, and a label never names the app's own data structure.",
  component: ({ props }) => (
    <SidebarGroupLabel icon={props.icon as IconName | undefined}>{props.label}</SidebarGroupLabel>
  ),
});

export const StatusBar = defineComponent({
  name: "StatusBar",
  props: z.object({
    message: z
      .string()
      .optional()
      .describe("The inert status line: human context, e.g. \"18 positions · €85,125.25\"."),
    progress: z
      .number()
      .optional()
      .describe("Fraction 0-1 shown as a small bar; omit when there is no progress."),
    trailing: z.array(z.any()).optional().describe("Right-aligned inert children, e.g. a Kbd."),
    hints: z
      .array(
        z.object({
          desc: z.string().describe("What the key does, e.g. \"refresh\"."),
          kbds: keyList,
        }),
      )
      .optional()
      .describe("Keyboard hints shown as key caps, in the human's form."),
  }),
  description:
    "The bar at the bottom of the window: inert text, a progress rail and key caps — never a button, never a control, never a counter of the app's own machinery, never an endpoint. One line of facts about what is open.",
  component: ({ props, renderNode }) => {
    const hints: Shortcut[] = (props.hints ?? []).map((hint, i) => ({
      id: hint.desc || `hint${i}`,
      desc: hint.desc,
      kbds: hint.kbds as KbdCode[],
    }));
    return (
      <AdwStatusBar
        message={props.message}
        progress={props.progress}
        trailing={renderNode(props.trailing ?? [])}
        hints={hints}
        style={{ width: "100%" }}
      />
    );
  },
});

export const Tabs = defineComponent({
  name: "Tabs",
  props: z.object({
    items: z.array(choice).describe("The tabs, in order: 2 to 6 short names."),
    name,
    value: reactive(
      z.string().optional().describe("The open tab, or a $var binding it reads and writes."),
    ),
    orientation: z
      .enum(["horizontal", "vertical"])
      .optional()
      .describe("Tab strip direction (default horizontal)."),
  }),
  description:
    "A strip of open documents directly under the header bar: cells separated by hairlines, the active cell a fill, horizontal scrolling, never wrapping. Use ViewSwitcher in the header bar for the window's views; Tabs are for documents, not for filters.",
  component: ({ props }) => {
    const field = useStateField(props.name, props.value);
    const cells = choiceCells(props.items);
    return (
      <AdwTabs
        items={cells}
        value={pickedId(cells, field.value)}
        orientation={props.orientation}
        onSelect={(id) => field.setValue(id)}
        style={{ width: "100%" }}
      />
    );
  },
});

export const Pagination = defineComponent({
  name: "Pagination",
  props: z.object({
    name,
    page: reactive(
      z.number().optional().describe("Current page, 1-based, or a $var binding it reads and writes."),
    ),
    pages: z.number().int().min(1).describe("How many pages there are."),
  }),
  description:
    "Numbered page strip for a long list, with ellipsis when it is long. Bind it and slice the rows by the page it writes — a long list is paged, never a wall.",
  component: ({ props }) => {
    const field = useStateField(props.name, props.page);
    const page = Math.max(1, Number(field.value ?? 1) || 1);
    return (
      <AdwPagination
        page={page}
        pages={props.pages}
        onPageChange={(next) => field.setValue(next)}
      />
    );
  },
});

export const Kbd = defineComponent({
  name: "Kbd",
  props: z.object({
    keys: z.array(z.string()).describe("The keys in order, e.g. [\"Ctrl\", \"K\"] for a chord."),
  }),
  description:
    "A key cap, shown the way a human reads it: Kbd(\"K\") for one key, Kbd([\"Ctrl\", \"K\"]) for a chord. It belongs in the StatusBar, next to the verb it performs.",
  component: ({ props }) => {
    const keys = props.keys ?? [];
    if (keys.length > 1) {
      return (
        <KbdCombo>
          {keys.map((key, i) => (
            <AdwKbd key={i}>{key}</AdwKbd>
          ))}
        </KbdCombo>
      );
    }
    return <AdwKbd>{keys[0] ?? ""}</AdwKbd>;
  },
});

export const KeyHint = defineComponent({
  name: "KeyHint",
  props: z.object({
    label: z.string().describe("The verb the key performs, e.g. \"Refresh\"."),
    keys: keyList.describe("Its bindings, e.g. [\"ctrl\", \"r\"] for one chord."),
  }),
  description:
    "A keyboard hint in the human's form: key caps plus the verb. KeyHint(\"Refresh\", [\"ctrl\", \"r\"]) — it belongs in the StatusBar, the window's only place for key caps.",
  component: ({ props }) => (
    <ShortcutHint
      group={{ desc: props.label, kbds: (props.keys ?? []) as KbdCode[] }}
    />
  ),
});
