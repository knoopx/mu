/**
 * The log's programs, held in one store.
 *
 * A program is not a tool call: it outlives the call that wrote it, is edited
 * in place by later ones, is painted from the row that first drew it, and
 * collects the interactions the human makes in it. So the store, not a tool,
 * owns them, and every tool is a thin verb over it — which is also why a
 * program keeps being live while an `openui-stream` call is still running.
 *
 * The store is in-memory on purpose. A session's tool rows persist; the screen
 * they drew does not, and a row whose program is gone says so instead of
 * inventing one.
 */

import { MAX_PROGRAMS, MAX_WAITING_EVENTS } from "../../constants";
import type { ParseResult } from "@openuidev/lang-core";

import type {
  OpenUIEventRecord,
  OpenUIDiagnostic,
  OpenUIProgramInfo,
  OpenUIProgramParse,
  OpenUIQueryInfo,
} from "../../types";

/** What a drawn screen publishes back about itself, on every paint. */
export interface ProgramPublication {
  drawn: string[];
  failures: string[];
  renderErrors: OpenUIDiagnostic[];
  queries: OpenUIQueryInfo[];
}

/** One program in the log. */
export interface ProgramRecord {
  name: string;
  source: string;
  /** True until a stream closes it: the program is still arriving. */
  streaming: boolean;
  /** The tool call whose row paints this program. */
  anchor: string;
  /** When the store last took a word of it. */
  at: number;
  /** The program `openui-state`, `openui-events` and `openui-switch` read by default. */
  live: boolean;
  parse: OpenUIProgramParse;
  /** The tree the parse produced: the renderer evaluates this, never re-parses. */
  result: ParseResult;
  /** The `$variable` values as the human left them, over the declared defaults. */
  values: Record<string, unknown>;
  events: OpenUIEventRecord[];
  publication: ProgramPublication;
}

/** What a write to the store answers, so the tool can say what happened. */
export interface ProgramWrite {
  record: ProgramRecord;
  replaced: boolean;
  evicted: string[];
  overflow: string;
}

export type ProgramStoreListener = () => void;

/** Two publications that say the same thing, so a repaint stays silent. */
function samePublication(a: ProgramPublication, b: ProgramPublication): boolean {
  return (
    a.drawn.join(",") === b.drawn.join(",") &&
    a.failures.join("\n") === b.failures.join("\n") &&
    a.renderErrors.map((row) => row.message).join("\n") ===
      b.renderErrors.map((row) => row.message).join("\n") &&
    a.queries
      .map((query) => `${query.statementId}:${query.tool}:${query.served ? "1" : "0"}`)
      .join(",") ===
      b.queries
        .map((query) => `${query.statementId}:${query.tool}:${query.served ? "1" : "0"}`)
        .join(",")
  );
}

export class ProgramStore {
  private readonly programs = new Map<string, ProgramRecord>();
  private readonly listeners = new Set<ProgramStoreListener>();
  private fixtures: Record<string, unknown> = {};
  private seq = 0;

  /** Bumped on every change; a subscription reads the store through it. */
  version = 0;

  /** A touch is waiting for the end of the current work. */
  private touching = false;

  subscribe = (listener: ProgramStoreListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): number => this.seq;

  /** Something outside the store changed and the log should paint again.
   *
   * A query answers when it likes, including in the middle of the paint that
   * asked for it, and React refuses a re-render asked for during a render. So a
   * touch lands once the current work is over, and a burst of them lands once.
   */
  touch = (): void => {
    if (this.touching) return;
    this.touching = true;
    queueMicrotask(() => {
      this.touching = false;
      this.notify();
    });
  };

  private notify(): void {
    this.seq += 1;
    this.version = this.seq;
    for (const listener of [...this.listeners]) listener();
  }

  list(): ProgramRecord[] {
    return [...this.programs.values()];
  }

  get(name: string): ProgramRecord | undefined {
    return this.programs.get(name);
  }

  has(name: string): boolean {
    return this.programs.has(name);
  }

  count(): number {
    return this.programs.size;
  }

  liveName(): string {
    for (const record of this.programs.values()) if (record.live) return record.name;
    return "";
  }

  /** The program a call means: the one it named, or the live one when it named none. */
  resolve(name: string | undefined): ProgramRecord | undefined {
    if (name === undefined || name === "") return this.get(this.liveName());
    return this.get(name);
  }

  /** Write a program whole, replacing whatever stood there. */
  setSource(
    name: string,
    source: string,
    parse: OpenUIProgramParse,
    result: ParseResult,
    toolCallId: string,
    opts: { streaming?: boolean; activate?: boolean } = {},
  ): ProgramWrite {
    const existing = this.programs.get(name);
    const evicted: string[] = [];
    let overflow = "";

    if (existing === undefined && this.programs.size >= MAX_PROGRAMS) {
      const oldest = this.oldestUnlocked();
      if (oldest !== "") {
        this.programs.delete(oldest);
        evicted.push(oldest);
      } else {
        overflow = `${String(MAX_PROGRAMS)} programs are already in the log; clear one first`;
      }
    }

    const activate = opts.activate !== false;
    const record: ProgramRecord = {
      name,
      source,
      streaming: opts.streaming === true,
      anchor: existing?.anchor ?? toolCallId,
      at: Date.now(),
      live: activate ? true : (existing?.live ?? this.programs.size === 0),
      parse,
      result,
      // A re-render keeps what the human did to the old program's state: the
      // language's own rule is that an edit keeps the $variable names.
      values: existing?.values ?? {},
      events: existing?.events ?? [],
      publication: { drawn: [], failures: [], renderErrors: [], queries: [] },
    };

    if (record.live) this.setLiveFlags(name);
    this.programs.set(name, record);
    this.notify();
    return { record, replaced: existing !== undefined, evicted, overflow };
  }

  /** Append a streamed chunk. An unknown name is an answer, not a new program. */
  append(
    name: string,
    chunk: string,
    parse: OpenUIProgramParse,
    result: ParseResult,
    opts: { done?: boolean } = {},
  ): ProgramWrite | { error: string } {
    const existing = this.programs.get(name);
    if (existing === undefined)
      return {
        error: `no program named ${name} is in the log — render it first, or stream a new name`,
      };

    existing.source += chunk;
    existing.parse = parse;
    existing.result = result;
    existing.at = Date.now();
    if (opts.done === true) existing.streaming = false;
    this.notify();
    return { record: existing, replaced: false, evicted: [], overflow: "" };
  }

  /** Stop a program streaming without changing its source. */
  close(name: string): boolean {
    const existing = this.programs.get(name);
    if (existing === undefined) return false;
    existing.streaming = false;
    existing.at = Date.now();
    this.notify();
    return true;
  }

  setLive(name: string): boolean {
    if (!this.programs.has(name)) return false;
    this.setLiveFlags(name);
    this.notify();
    return true;
  }

  private setLiveFlags(name: string): void {
    for (const record of this.programs.values()) record.live = record.name === name;
  }

  private oldestUnlocked(): string {
    let oldest = "";
    let at = Number.POSITIVE_INFINITY;
    for (const record of this.programs.values()) {
      if (record.live || record.streaming) continue;
      if (record.at < at) {
        at = record.at;
        oldest = record.name;
      }
    }
    return oldest;
  }

  /** Take a program, or every one of them, out of the log. */
  remove(name: string): boolean {
    const had = this.programs.delete(name);
    if (had) this.notify();
    return had;
  }

  clearAll(): string[] {
    const names = [...this.programs.keys()];
    this.programs.clear();
    if (names.length > 0) this.notify();
    return names;
  }

  /* ------------------------------------------------------------ fixtures */

  getFixtures(): Record<string, unknown> {
    return this.fixtures;
  }

  setFixtures(fixtures: Record<string, unknown>): { names: string[]; cleared: boolean } {
    const names = Object.keys(fixtures);
    this.fixtures = names.length === 0 ? {} : { ...fixtures };
    for (const record of this.programs.values()) {
      // A program's data changed, so what its queries answered is stale.
      record.publication.queries = record.publication.queries.map((query) => ({
        ...query,
        served: names.includes(query.tool),
      }));
    }
    this.notify();
    return { names, cleared: names.length === 0 };
  }

  /* ------------------------------------------------------------- events */

  pushEvent(name: string, event: OpenUIEventRecord): void {
    const record = this.programs.get(name);
    if (record === undefined) return;
    record.events.push(event);
    if (record.events.length > MAX_WAITING_EVENTS)
      record.events.splice(0, record.events.length - MAX_WAITING_EVENTS);
    record.at = Date.now();
    this.notify();
  }

  waiting(name: string): number {
    return this.programs.get(name)?.events.length ?? 0;
  }

  /** Read what is waiting. Draining is the default, because the agent acts on it. */
  drain(name: string | undefined, limit: number, clear: boolean): {
    events: OpenUIEventRecord[];
    omitted: number;
    waiting: number;
    record: ProgramRecord | undefined;
  } {
    const record = this.resolve(name);
    if (record === undefined)
      return { events: [], omitted: 0, waiting: 0, record: undefined };

    const events = record.events.slice(0, limit);
    const omitted = record.events.length - events.length;
    if (clear) {
      record.events = record.events.slice(events.length);
      this.notify();
    }
    return { events, omitted, waiting: record.events.length, record };
  }

  /* -------------------------------------------------------- publication */

  /** What a paint found out about the screen. A paint that learned nothing is quiet. */
  publish(name: string, publication: ProgramPublication): void {
    const record = this.programs.get(name);
    if (record === undefined) return;
    if (samePublication(record.publication, publication)) return;
    record.publication = publication;
    this.notify();
  }

  /** Write a `$variable` the human changed, and say which one it was. */
  setValue(name: string, variable: string, value: unknown): void {
    const record = this.programs.get(name);
    if (record === undefined) return;
    record.values[variable] = value;
    record.at = Date.now();
    this.notify();
  }

  /** Every value the screen currently holds: declared defaults, then the human's. */
  valuesOf(record: ProgramRecord | undefined): Record<string, unknown> {
    if (record === undefined) return {};
    return { ...record.parse.variables, ...record.values };
  }

  /** The program as a tool or a row reads it. */
  infoOf(record: ProgramRecord): OpenUIProgramInfo {
    return {
      name: record.name,
      chars: record.source.length,
      lines: record.source.split("\n").length,
      streaming: record.streaming,
      statements: record.parse.statements,
      // What the screen has painted, or what the parse says it will paint when
      // no row has had the chance to draw it yet.
      components:
        record.publication.drawn.length > 0
          ? record.publication.drawn.length
          : record.parse.components.length,
      unresolved: record.parse.unresolved.length,
      errors:
        record.parse.diagnostics.filter((row) => row.severity === "error").length +
        record.publication.renderErrors.length,
      waiting: record.events.length,
      live: record.live,
      drawn: true,
    };
  }
}

/** The one store the log paints from. */
export const programStore = new ProgramStore();
