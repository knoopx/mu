/**
 * What is in the log.
 *
 * A program the agent rendered, what the renderer published back about it, and
 * what the human did to it. The store is the only place that holds them, and
 * it holds them for the running app: there is no file, no port and no page —
 * a tool call writes here and the tool row that made the call reads it back.
 *
 * Every program remembers the tool call that last rendered it (`owner`). That is
 * what makes one row in the log the live one: the newest render of a program
 * paints the program, and every older row for the same name stays a record of
 * what that call sent.
 */

import { MAX_EVENTS } from "../constants";

export interface OpenuiDiagnostic {
  code: string;
  message: string;
  hint?: string;

  severity?: "warning";
}

/** One thing the human did in a rendered program. */
export interface OpenuiEvent {
  at: number;
  type: string;
  message: string;
  params?: Record<string, unknown>;
  formState?: Record<string, unknown>;
  formName?: string;
}

export interface OpenuiProgram {
  name: string;
  lang: string;
  streaming: boolean;
  updatedAt: number;

  /** the tool call whose row paints this program */
  owner: string;
}

/** What the renderer published about a program, the only view of it the agent gets. */
export interface OpenuiRuntime {
  errors: OpenuiDiagnostic[];

  /** the `$variable` values the program holds right now */
  state: Record<string, unknown>;

  events: OpenuiEvent[];

  unread: number;
  queryErrors: string[];

  components: string[];
  statements: number;
  unresolved: string[];

  incomplete: boolean;
}

export interface ProgramSnapshot {
  programs: Record<string, OpenuiProgram>;
  order: string[];
  active: string | null;
  runtime: Record<string, OpenuiRuntime>;

  /** tool name -> the JSON a Query(name, args, default) call resolves to */
  fixtures: Record<string, unknown>;
}

export type ProgramListener = () => void;

export function emptyRuntime(): OpenuiRuntime {
  return {
    errors: [],
    state: {},
    events: [],
    unread: 0,
    queryErrors: [],
    components: [],
    statements: 0,
    unresolved: [],
    incomplete: false,
  };
}

const now = (): number => Date.now();

export class ProgramStore {
  private snapshot: ProgramSnapshot = {
    programs: {},
    order: [],
    active: null,
    runtime: {},
    fixtures: {},
  };

  private listeners = new Set<ProgramListener>();

  subscribe = (listener: ProgramListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): ProgramSnapshot => this.snapshot;

  /** The program the log paints live, or none when nothing is in the log. */
  activeProgram = (): OpenuiProgram | null => {
    const { active } = this.snapshot;
    return active === null ? null : (this.snapshot.programs[active] ?? null);
  };

  program = (name: string): OpenuiProgram | undefined =>
    this.snapshot.programs[name];

  runtimeOf = (name: string): OpenuiRuntime =>
    this.snapshot.runtime[name] ?? emptyRuntime();

  hasProgram = (name: string): boolean => this.snapshot.programs[name] !== undefined;

  /** Every program name, in the order they first arrived. */
  names = (): string[] => [...this.snapshot.order];

  /** Whether this tool call is the one that still paints this program. */
  isOwner = (name: string, toolCallId: string): boolean =>
    this.snapshot.programs[name]?.owner === toolCallId;

  upsert(
    name: string,
    patch: {
      lang?: string;
      streaming?: boolean;
      activate?: boolean;
      owner?: string;
    },
  ): OpenuiProgram {
    const prev = this.snapshot.programs[name];
    return this.writeProgram(
      name,
      patch.lang ?? prev?.lang ?? "",
      patch.streaming ?? prev?.streaming ?? false,
      patch.activate === true,
      patch.owner ?? prev?.owner ?? "",
    );
  }

  /** One chunk of a program being written; the stream stays live until `done`. */
  appendChunk(
    name: string,
    chunk: string,
    done: boolean,
    owner: string,
  ): OpenuiProgram {
    const prev = this.snapshot.programs[name];
    return this.writeProgram(
      name,
      (prev?.lang ?? "") + chunk,
      !done,
      prev === undefined,
      owner,
    );
  }

  setActive(name: string): void {
    if (this.snapshot.active === name) return;
    this.commit({ ...this.snapshot, active: name });
  }

  /** One program, or every program when none is named. */
  removeProgram(name?: string): void {
    const snapshot = this.snapshot;
    if (name === undefined) {
      if (snapshot.order.length === 0) return;
      this.commit({
        ...snapshot,
        programs: {},
        order: [],
        active: null,
        runtime: {},
      });
      return;
    }

    if (snapshot.programs[name] === undefined) return;

    const programs = { ...snapshot.programs };
    delete programs[name];
    const runtime = { ...snapshot.runtime };
    delete runtime[name];
    const order = snapshot.order.filter((entry) => entry !== name);
    const active = snapshot.active === name ? (order[0] ?? null) : snapshot.active;

    this.commit({ ...snapshot, programs, order, runtime, active });
  }

  /** What the renderer saw: its errors, its `$var` state, the components it drew. */
  setRuntime(name: string, patch: Partial<OpenuiRuntime>): void {
    if (Object.keys(patch).length === 0) return;
    const prev = this.snapshot.runtime[name];
    if (prev === undefined) {
      this.commit({
        ...this.snapshot,
        runtime: {
          ...this.snapshot.runtime,
          [name]: { ...emptyRuntime(), ...patch },
        },
      });
      return;
    }
    this.commit({
      ...this.snapshot,
      runtime: { ...this.snapshot.runtime, [name]: { ...prev, ...patch } },
    });
  }

  pushEvent(name: string, entry: Omit<OpenuiEvent, "at">): void {
    const prev = this.runtimeOf(name);
    const events = [...prev.events, { ...entry, at: now() }];
    this.setRuntime(name, {
      events: events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events,
      unread: prev.unread + 1,
    });
  }

  /** What the human did since the last read; a drain, so each event is delivered once. */
  takeEvents(name?: string, clear = true): OpenuiEvent[] {
    if (name !== undefined) return this.drain([name], clear);

    const all: OpenuiEvent[] = [];
    for (const program of this.snapshot.order)
      all.push(...this.runtimeOf(program).events);
    all.sort((a, b) => a.at - b.at);
    if (clear) this.clearEvents(this.names());
    return all;
  }

  setFixtures(next: Record<string, unknown>): void {
    this.commit({ ...this.snapshot, fixtures: next ?? {} });
  }

  fixtureNames = (): string[] => Object.keys(this.snapshot.fixtures);

  /** A fresh programs: what a new session starts with. */
  reset(): void {
    this.commit({
      programs: {},
      order: [],
      active: null,
      runtime: {},
      fixtures: {},
    });
  }

  private drain(names: readonly string[], clear: boolean): OpenuiEvent[] {
    const events: OpenuiEvent[] = [];
    for (const name of names) events.push(...this.runtimeOf(name).events);
    if (clear) this.clearEvents(names);
    return events;
  }

  private clearEvents(names: readonly string[]): void {
    const runtime = { ...this.snapshot.runtime };
    let touched = false;
    for (const name of names) {
      const entry = runtime[name];
      if (entry === undefined) continue;
      if (entry.events.length === 0 && entry.unread === 0) continue;
      runtime[name] = { ...entry, events: [], unread: 0 };
      touched = true;
    }
    if (touched) this.commit({ ...this.snapshot, runtime });
  }

  private writeProgram(
    name: string,
    lang: string,
    streaming: boolean,
    activate: boolean,
    owner: string,
  ): OpenuiProgram {
    const snapshot = this.snapshot;
    const prev = snapshot.programs[name];
    const fresh = prev === undefined;
    const active =
      activate || (fresh && snapshot.active === null) ? name : snapshot.active;

    if (
      !fresh &&
      prev.lang === lang &&
      prev.streaming === streaming &&
      prev.owner === owner &&
      active === snapshot.active
    )
      return prev;

    const next: OpenuiProgram = { name, lang, streaming, updatedAt: now(), owner };
    this.commit({
      ...snapshot,
      programs: { ...snapshot.programs, [name]: next },
      order: fresh ? [...snapshot.order, name] : snapshot.order,
      active,
      runtime:
        snapshot.runtime[name] === undefined
          ? { ...snapshot.runtime, [name]: emptyRuntime() }
          : snapshot.runtime,
    });
    return next;
  }

  private commit(next: ProgramSnapshot): void {
    this.snapshot = next;
    for (const listener of [...this.listeners]) listener();
  }
}

export const programStore = new ProgramStore();
