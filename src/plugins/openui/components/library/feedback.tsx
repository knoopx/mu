import {
  action,
  defineComponent,
  useFormName,
  useTriggerAction,
} from "@openuidev/react-lang";
import { useState } from "react";
import { z } from "zod";
import {
  Banner as AdwBanner,
  Empty as AdwEmpty,
  EmptyAction,
  EmptyDescription,
  EmptyMedia,
  EmptyTitle,
  StatusPage as AdwStatusPage,
  Toast as AdwToast,
  type BannerTone,
  type EmptyTone,
  type IconName,
  type StatusPageTone,
  type ToastType,
} from "adwaita-gpuix";

const icon = z
  .string()
  .optional()
  .describe('adwaita icon name for the figure, e.g. "inbox", "search", "warning".');

const tone = z
  .enum(["accent", "destructive", "success", "warning"])
  .optional()
  .describe("Colour of the figure (default accent).");

const FIRE =
  "Wire its button to a step with `action` (@ToAssistant, @Set) so the screen can answer the click.";

export const StatusPage = defineComponent({
  name: "StatusPage",
  props: z.object({
    title: z.string().describe("The one line that says what happened."),
    description: z
      .string()
      .optional()
      .describe("Plain human sentence under the title: why, and what to do next."),
    icon,
    tone,
    children: z.array(z.any()).optional().describe("The action that gets out of this state."),
  }),
  description:
    "A whole-view state: figure, title, one sentence and the way out, centred in the primary pane. Use it when the view has nothing to show — never a bare heading over nothing, never a card.",
  component: ({ props, renderNode }) => (
    <AdwStatusPage
      title={props.title}
      description={props.description}
      icon={props.icon as IconName | undefined}
      tone={props.tone as StatusPageTone | undefined}
      style={{ width: "100%" }}
    >
      {renderNode(props.children ?? [])}
    </AdwStatusPage>
  ),
});

export const Empty = defineComponent({
  name: "Empty",
  props: z.object({
    title: z.string().describe("What is missing, in the human's words — \"No crypto positions\"."),
    description: z
      .string()
      .optional()
      .describe("One sentence saying how to fill it."),
    icon,
    tone,
    children: z.array(z.any()).optional().describe("The action that fills this list."),
  }),
  description:
    "The empty state of a list: figure, one sentence and the verb that fills it, replacing the rows it describes. Plain language about the human's objects — never a raw id, a placeholder enum, the word \"empty\", or the app's own data structure.",
  component: ({ props, renderNode }) => (
    <AdwEmpty style={{ width: "100%" }}>
      <EmptyMedia icon={props.icon as IconName | undefined} tone={props.tone as EmptyTone | undefined} />
      <EmptyTitle>{props.title}</EmptyTitle>
      {props.description ? <EmptyDescription>{props.description}</EmptyDescription> : null}
      {props.children && props.children.length > 0 ? (
        <EmptyAction>{renderNode(props.children)}</EmptyAction>
      ) : null}
    </AdwEmpty>
  ),
});

export const Toast = defineComponent({
  name: "Toast",
  props: z.object({
    message: z.string().describe("What just happened, in one line — \"Filtered to Stocks\"."),
    body: z.string().optional().describe("Second line: the number it moved, the object it touched."),
    actionLabel: z.string().optional().describe("Verb of the one thing the human can do about it."),
    action: action()
      .optional()
      .describe("Step the button runs, e.g. @Reset($kind)."),
    type: z
      .enum(["default", "success", "info", "warning", "error", "destructive", "loading"])
      .optional()
      .describe("Its icon and colour (default default)."),
    dismissible: z.boolean().optional().describe("Show the close button (default true)."),
  }),
  description:
    "The answer to a click: a transient strip naming what changed, with at most one verb. Bind it to the state the action moved, so the acknowledgement is live and leaves with the cause. " +
    FIRE,
  component: ({ props }) => {
    const triggerAction = useTriggerAction();
    const formName = useFormName();
    const [open, setOpen] = useState(true);
    if (!open) return null;
    return (
      <AdwToast
        message={props.message}
        body={props.body}
        actionLabel={props.actionLabel}
        type={props.type as ToastType | undefined}
        onAction={() => {
          void triggerAction(props.actionLabel ?? props.message, formName, props.action);
        }}
        onDismiss={props.dismissible === false ? undefined : () => setOpen(false)}
        style={{ width: "100%" }}
      />
    );
  },
});

export const Banner = defineComponent({
  name: "Banner",
  props: z.object({
    title: z.string().describe("The headline of the message, e.g. \"Showing Stocks only\"."),
    body: z
      .string()
      .optional()
      .describe("Second line in dimmed text: the figures behind the headline."),
    tone: z
      .enum(["info", "warning", "error", "success"])
      .optional()
      .describe("Its tint and icon (default info)."),
    icon: z.string().optional().describe("Replace the tone's icon with this one."),
    showIcon: z.boolean().optional().describe("Show the leading icon (default true)."),
    actionLabel: z.string().optional().describe("Verb of the one thing to do about it."),
    action: action()
      .optional()
      .describe("Step the verb runs, e.g. @Set($kind, \"All\")."),
    narrow: z.boolean().optional().describe("Stack the verb under the text in a narrow pane."),
    dismissible: z.boolean().optional().describe("Show the close button (default true)."),
  }),
  description:
    "The strip that spans a view when a condition applies to it: tint fill, accent edge, one verb, closable, flush to the pane width, no border. It sits at the top of the pane it describes; bind it to the state that caused it. " +
    FIRE,
  component: ({ props }) => {
    const triggerAction = useTriggerAction();
    const formName = useFormName();
    const [open, setOpen] = useState(true);
    if (!open) return null;
    return (
      <AdwBanner
        title={props.title}
        body={props.body}
        tone={props.tone as BannerTone | undefined}
        icon={props.icon as IconName | undefined}
        showIcon={props.showIcon}
        actionLabel={props.actionLabel}
        narrow={props.narrow}
        onAction={() => {
          void triggerAction(props.actionLabel ?? props.title, formName, props.action);
        }}
        onClose={props.dismissible === false ? undefined : () => setOpen(false)}
        style={{ width: "100%" }}
      />
    );
  },
});
