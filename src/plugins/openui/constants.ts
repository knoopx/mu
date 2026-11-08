/**
 * What the OpenUI plugin shares: the tool names the user's guardrail rules
 * point at, the bounds every read and every program lives inside, and the
 * words a program's rows are painted with.
 */

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

/**
 * These eleven names are what a guardrail rule and a story point at, so they
 * are never renamed or aliased.
 */
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

/** The root statement a program must define, and the component it must name. */
export const ROOT_STATEMENT = "root";
export const ROOT_COMPONENT = "Screen";

/** How many programs the log holds before the oldest render stops being drawn. */
export const MAX_PROGRAMS = 12;

/** A program's source is bounded: a screen, not a website. */
export const MAX_PROGRAM_CHARS = 24_000;

/** One streamed chunk is bounded so a program arrives in readable pieces. */
export const MAX_CHUNK_CHARS = 6_000;

/** A program name is a slug the model keeps stable across renders. */
export const MAX_PROGRAM_NAME = 48;

/** The name a write takes when the call leaves one out. */
export const DEFAULT_PROGRAM_NAME = "screen";

/** How many interactions wait on the agent before the queue drops the oldest. */
export const MAX_WAITING_EVENTS = 200;

/** How many interactions one `openui-events` call drains by default. */
export const DEFAULT_EVENT_LIMIT = 40;
export const MAX_EVENT_LIMIT = 100;

/** How many rows the library index and a program's component list answer with. */
export const DEFAULT_LIBRARY_LIMIT = 40;
export const MAX_LIBRARY_LIMIT = 120;
export const MAX_COMPONENT_ROWS = 24;

/** How much of a program's source `openui-state` prints back. */
export const MAX_STATE_SOURCE_CHARS = 4_000;

/** How many fixture keys one `openui-tools` call may serve, and how deep. */
export const MAX_FIXTURE_KEYS = 40;
export const MAX_FIXTURE_CHARS = 12_000;

/** How many `$variable` values one state read prints. */
export const MAX_VALUE_ROWS = 40;

/** What the program's own spacing tiers mean in the screen's tokens. */
export const PROGRAM_GAP_TIER = {
  inner: 1,
  group: 3,
  section: 6,
} as const;

/** A program's default gaps: what a Stack and a Pane leave when left unset. */
export const DEFAULT_PROGRAM_GAP = PROGRAM_GAP_TIER.group;
export const SCREEN_GAP = PROGRAM_GAP_TIER.section;
export const PANE_GAP = PROGRAM_GAP_TIER.group;

/** How a program's rows are badged: what is a hard error, what is only a note. */
export const OPENUI_BADGE_VARIANTS: Readonly<Record<string, BadgeVariant>> = {
  error: "destructive",
  hard: "destructive",
  failed: "destructive",
  incomplete: "warning",
  open: "warning",
  warning: "warning",
  unresolved: "warning",
  running: "secondary",
  live: "secondary",
  showing: "secondary",
  drawn: "secondary",
  ok: "outline",
};

/** The note a row shows when a program exists but is no longer drawn. */
export const NOT_DRAWN_NOTE = "no longer in the log";
