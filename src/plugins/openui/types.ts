/**
 * What the openui tools take and what they answer.
 *
 * One file for the whole plugin's shared shapes: the parameters each tool
 * takes, the `details` each returns (the log's copy of the answer, read by
 * `lib/toolView.ts`), and the view the transcript rows are drawn from. The
 * model's copy of every answer is built in `lib/answer.ts` from the same
 * fields, so a fact is stated once and read twice.
 */

import type {
  ToolPaintSection,
  ToolRowCell,
} from "../core/lib/ui/toolRowPaint";
import type { OpenuiDiagnostic, OpenuiEvent } from "./lib/programStore";

export type { OpenuiDiagnostic, OpenuiEvent };

/**
 * The one status vocabulary of this plugin. `invalid` is not a failure: the
 * program is in the log and the human can see it; the parse just has hard
 * errors in it.
 */
export type OpenuiToolStatus =
  | "ok"
  | "invalid"
  | "empty"
  | "unknown-program"
  | "no-program"
  | "failed";

/** A program the renderer published nothing about yet. */
export interface OpenuiRuntimeSummary {
  statements: number;
  components: string[];
  unresolved: string[];
  queryErrors: string[];
  incomplete: boolean;
  streaming: boolean;
  unread: number;
  errors: OpenuiDiagnostic[];
}

/** What one parse answered, and what the log holds after it. */
export interface OpenuiReport {
  program: string;
  status: OpenuiToolStatus;
  ok: boolean;
  streaming: boolean;
  incomplete: boolean;
  statements: number;
  components: string[];
  unresolved: string[];
  errors: OpenuiDiagnostic[];
  chars: number;

  active: string | null;
  programs: string[];
}

export interface OpenuiPromptParams {
  preamble?: string;
  tools?: string[];
  examples?: string[];
  editMode?: boolean;
}

export interface OpenuiPromptDetails {
  status: OpenuiToolStatus;
  chars: number;
  lines: number;

  /** how many components the reference documents */
  components: number;
  root: string;
  groups: string[];
  editMode: boolean;
  toolNames: string[];
}

export interface OpenuiLibraryParams {
  name?: string;
}

export interface OpenuiLibraryComponent {
  name: string;
  description: string;
  group: string;
}

export interface OpenuiLibraryDetails {
  status: OpenuiToolStatus;

  name: string;

  description: string;
  group: string;
  root: string;
  chars: number;

  componentCount: number;
  groupCount: number;
  groups: Record<string, string[]>;
  components: OpenuiLibraryComponent[];

  /** the component's own JSON Schema, printed in full for one named component */
  schema: unknown;

  /** the group's own rules, the notes the prompt teaches with the group */
  groupNotes: string[];

  /** the same schema read as rows: one prop, its type, whether it is required */
  props: OpenuiPropRow[];
}

export interface OpenuiPropRow {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

export interface OpenuiValidateParams {
  code: string;
}

export type OpenuiValidateDetails = OpenuiReport;

export interface OpenuiRenderParams {
  name?: string;
  code: string;
  done?: boolean;
  activate?: boolean;
}

export type OpenuiRenderDetails = OpenuiReport & { receivedChars: number };

export interface OpenuiStreamParams {
  name?: string;
  chunk: string;
  done?: boolean;
}

export type OpenuiStreamDetails = OpenuiReport & { receivedChars: number };

export interface OpenuiStateParams {
  name?: string;
}

export interface OpenuiStateDetails {
  status: OpenuiToolStatus;
  program: string;

  lang: string;
  chars: number;
  updatedAt: number;

  state: Record<string, unknown>;
  runtime: OpenuiRuntimeSummary;
}

export interface OpenuiEventsParams {
  name?: string;
  clear?: boolean;
}

export interface OpenuiEventsDetails {
  status: OpenuiToolStatus;
  program: string;
  cleared: boolean;
  count: number;
  events: OpenuiEvent[];
}

export interface OpenuiToolsParams {
  fixtures: Record<string, unknown>;
}

export interface OpenuiToolsDetails {
  status: OpenuiToolStatus;
  count: number;
  fixtures: string[];
}

export interface OpenuiListParams {}

export interface OpenuiProgramRow {
  name: string;
  chars: number;
  streaming: boolean;
  statements: number;
  errors: number;
  unread: number;
  updatedAt: number;
}

export interface OpenuiListDetails {
  status: OpenuiToolStatus;
  active: string | null;
  count: number;
  programs: OpenuiProgramRow[];
  fixtures: string[];
}

export interface OpenuiSwitchParams {
  name: string;
}

export interface OpenuiSwitchDetails {
  status: OpenuiToolStatus;
  active: string;
  programs: string[];
}

export interface OpenuiClearParams {
  name?: string;
}

export interface OpenuiClearDetails {
  status: OpenuiToolStatus;
  cleared: string;
  active: string | null;
  programs: string[];
}

/** Everything the transcript needs to draw one openui tool call. */
export interface OpenuiToolView {
  tool: string;
  status: OpenuiToolStatus;
  program: string;

  /** whether this row is the live one: the newest call that rendered the program */
  live: boolean;

  headline: string;
  cells: ToolRowCell[];
  sections: ToolPaintSection[];
  note: string;
  hiddenErrors: number;
}
