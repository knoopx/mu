/**
 * Drawing one program, and reporting what the drawing cost.
 *
 * The renderer is react-lang's: it parses the accumulated source and draws the
 * components this app's library registers. What it saw — parse errors, runtime
 * errors, the `$variable` values the human has changed, the components it
 * actually drew, and every click, keystroke and submit — is published back into
 * `lib/programStore.ts`, which is the only way the agent finds out how the
 * program turned out (`openui-state`) and what the human did with it
 * (`openui-events`).
 *
 * A program has no chrome of its own here: the tool row already says which
 * call rendered it, and a program is a GNOME screen — header, content, status
 * bar — drawn from the same components the log is drawn from.
 */

import { useCallback, useMemo, useRef } from "react";
import type { JSX } from "react";
import {
  Renderer,
  ToolNotFoundError,
  type LibraryActionEvent,
  type OpenUIError,
  type ParseResult,
} from "@openuidev/react-lang";
import { useAdwaita } from "adwaita-gpuix";

import { useProgramSnapshot } from "../hooks/usePrograms";
import {
  diagnosticKey,
  fromOpenUIError,
  parseDiagnostic,
} from "../lib/analysis";
import { programStore, type OpenuiDiagnostic } from "../lib/programStore";
import { library } from "./library/registry";

type ToolMap = Record<string, (args: Record<string, unknown>) => Promise<unknown>>;

/** Keys the renderer asks of the provider itself, so the proxy must not answer them. */
const RESERVED_KEYS = new Set(["callTool", "then", "catch", "finally", "toJSON"]);

/**
 * What `Query(name, args, default)` resolves to. The app has no backends of
 * its own: the JSON the agent put there with `openui-tools` is the data the
 * program shows, and a name it did not supply fails as a missing tool rather
 * than pretending to be empty.
 */
function fixtureProvider(fixtures: Record<string, unknown>): ToolMap {
  const target: ToolMap = {};
  for (const [name, value] of Object.entries(fixtures))
    target[name] = async () => value;
  const available = Object.keys(target);

  return new Proxy(target, {
    get(holder: ToolMap, key: string | symbol): unknown {
      if (typeof key !== "string" || RESERVED_KEYS.has(key))
        return Reflect.get(holder, key);
      const known = holder[key];
      if (known !== undefined) return known;
      return async (): Promise<unknown> => {
        throw new ToolNotFoundError(key, available);
      };
    },
  });
}

export interface ProgramOutputProps {
  name: string;
}

export function ProgramOutput({ name }: ProgramOutputProps): JSX.Element | null {
  const t = useAdwaita();
  const snapshot = useProgramSnapshot();
  const program = snapshot.programs[name];

  const parseKeys = useRef<Set<string>>(new Set());
  const parseErrors = useRef<OpenuiDiagnostic[]>([]);
  const liveErrors = useRef<OpenuiDiagnostic[]>([]);
  const published = useRef<string>("");

  /** Publish one patch, unless this exact patch is already published. */
  const publish = useCallback(
    (patch: Parameters<typeof programStore.setRuntime>[1]): void => {
      let key: string;
      try {
        key = JSON.stringify(patch);
      } catch {
        key = "";
      }
      if (key === published.current && programStore.runtimeOf(name) !== undefined)
        return;
      published.current = key;
      programStore.setRuntime(name, patch);
    },
    [name],
  );

  const merged = useCallback(
    (): OpenuiDiagnostic[] => [...parseErrors.current, ...liveErrors.current],
    [],
  );

  const handleParseResult = useCallback(
    (result: ParseResult | null): void => {
      if (result === null) {
        parseKeys.current = new Set();
        parseErrors.current = [];
        publish({
          errors: merged(),
          statements: 0,
          components: [],
          unresolved: [],
          incomplete: true,
        });
        return;
      }

      parseKeys.current = new Set(
        result.meta.errors.map((entry) =>
          diagnosticKey(entry.code, entry.component, entry.path, entry.message),
        ),
      );
      parseErrors.current = result.meta.errors.map(parseDiagnostic);

      publish({
        errors: merged(),
        statements: result.meta.statementCount,
        unresolved: [...result.meta.unresolved],
        incomplete: result.meta.incomplete,
      });
    },
    [name, publish, merged],
  );

  const handleError = useCallback(
    (errors: OpenUIError[]): void => {
      const fresh: OpenuiDiagnostic[] = [];
      const queries: string[] = [];
      for (const error of errors) {
        const key = diagnosticKey(
          error.code,
          error.component,
          error.path,
          error.message,
        );
        if (error.source === "parser" && parseKeys.current.has(key)) continue;
        fresh.push(fromOpenUIError(error));
        if (error.source === "query" || error.source === "mutation")
          queries.push(`${error.code}: ${error.message}`);
      }
      liveErrors.current = fresh;
      publish({ errors: merged(), queryErrors: queries });
    },
    [name, publish, merged],
  );

  const handleStateUpdate = useCallback(
    (state: Record<string, unknown>): void => {
      publish({ state: { ...state } });
    },
    [name, publish],
  );

  const handleAction = useCallback(
    (event: LibraryActionEvent<typeof library>): void => {
      programStore.pushEvent(name, {
        type: event.type,
        message: event.humanFriendlyMessage,
        params: event.params,
        formState: event.formState,
        formName: event.formName,
      });
    },
    [name],
  );

  const toolProvider = useMemo(
    () => fixtureProvider(snapshot.fixtures),
    [snapshot.fixtures],
  );

  if (program === undefined) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        gap: t.space.sm,
      }}
    >
      <Renderer.Root
        response={program.lang}
        library={library}
        isStreaming={program.streaming}
        toolProvider={toolProvider}
        onAction={handleAction}
        onStateUpdate={handleStateUpdate}
        onError={handleError}
        onParseResult={handleParseResult}
      >
        <Renderer.Content />
      </Renderer.Root>
    </div>
  );
}
