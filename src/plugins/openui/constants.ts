import type { BadgeVariant } from "adwaita-gpuix";

export const OPENUI_PROMPT_TOOL = "openui-prompt";
export const OPENUI_LIBRARY_TOOL = "openui-library";
export const OPENUI_VALIDATE_TOOL = "openui-validate";
export const OPENUI_RENDER_TOOL = "openui-render";
export const OPENUI_STREAM_TOOL = "openui-stream";
export const OPENUI_STATE_TOOL = "openui-state";
export const OPENUI_EVENTS_TOOL = "openui-events";
export const OPENUI_TOOLS_TOOL = "openui-tools";
export const OPENUI_LIST_TOOL = "openui-list";
export const OPENUI_SWITCH_TOOL = "openui-switch";
export const OPENUI_CLEAR_TOOL = "openui-clear";

/** Every openui tool the agent can call, learn-render-read order. */
export const OPENUI_TOOL_NAMES: readonly string[] = [
  OPENUI_PROMPT_TOOL,
  OPENUI_LIBRARY_TOOL,
  OPENUI_VALIDATE_TOOL,
  OPENUI_RENDER_TOOL,
  OPENUI_STREAM_TOOL,
  OPENUI_STATE_TOOL,
  OPENUI_EVENTS_TOOL,
  OPENUI_TOOLS_TOOL,
  OPENUI_LIST_TOOL,
  OPENUI_SWITCH_TOOL,
  OPENUI_CLEAR_TOOL,
];

/**
 * The tools that put a program in the log. They are the ones a row paints
 * live, so they are also the ones a description has to keep honest about what
 * the human now sees.
 */
export const OPENUI_WRITE_TOOLS: readonly string[] = [
  OPENUI_RENDER_TOOL,
  OPENUI_STREAM_TOOL,
  OPENUI_SWITCH_TOOL,
  OPENUI_CLEAR_TOOL,
  OPENUI_TOOLS_TOOL,
];

export const OPENUI_TOOL_LABELS: Record<string, string> = {
  [OPENUI_PROMPT_TOOL]: "OpenUI language reference",
  [OPENUI_LIBRARY_TOOL]: "OpenUI component library",
  [OPENUI_VALIDATE_TOOL]: "OpenUI validate",
  [OPENUI_RENDER_TOOL]: "OpenUI render",
  [OPENUI_STREAM_TOOL]: "OpenUI stream",
  [OPENUI_STATE_TOOL]: "OpenUI program state",
  [OPENUI_EVENTS_TOOL]: "OpenUI interaction events",
  [OPENUI_TOOLS_TOOL]: "OpenUI query fixtures",
  [OPENUI_LIST_TOOL]: "OpenUI program list",
  [OPENUI_SWITCH_TOOL]: "OpenUI show program",
  [OPENUI_CLEAR_TOOL]: "OpenUI clear programs",
};

/** The program a call means when it names none — the one screen a call renders by default. */
export const DEFAULT_PROGRAM = "screen";

/** How long a program may get before a call is told to split or trim it. */
export const MAX_PROGRAM_CHARS = 60_000;

/** How many interaction events the log holds for one program before the oldest go. */
export const MAX_EVENTS = 200;

/** How many diagnostics one answer prints; the rest is counted, not shown. */
export const MAX_DIAGNOSTIC_ROWS = 15;

/** How far the component walk goes before it stops counting a program's nodes. */
export const MAX_WALK_NODES = 2000;

/** How an openui badge is painted: what blocks a render, what only explains one. */
export const OPENUI_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  error: "destructive",
  parse: "destructive",
  warning: "warning",
  unresolved: "warning",
  incomplete: "warning",
  streaming: "warning",
  query: "warning",
  live: "default",
  replaced: "secondary",
  ok: "secondary",
};
