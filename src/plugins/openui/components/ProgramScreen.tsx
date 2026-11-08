/**
 * Drawing a program in the log.
 *
 * This is the renderer: it evaluates the parse the store holds, walks the tree
 * through this app's library, and hands every component the context it needs
 * to read a `$variable`, change one, and report what the human did. A program
 * that is no longer in the store says so — the row that drew it stays in the
 * conversation as the record that it was drawn.
 */

import type { JSX } from "react";
import { isReactiveAssign, type ElementNode } from "@openuidev/lang-core";
import { T, useAdwaita } from "adwaita-gpuix";

import { NOT_DRAWN_NOTE } from "../constants";
import { useProgram } from "../hooks/useProgram";
import { useProgramPaint } from "../hooks/useProgramPaint";
import { runActionSteps } from "../lib/analysis/run";
import { programStore } from "../lib/programStore/store";
import { HAIRLINE } from "../../core/lib/ui/tokens";
import { paneRadius, programGap, screenPad } from "../lib/tokens";
import {
  programEdge,
  programTextColor,
} from "../lib/theme";
import type { ProgramBinding, ProgramContext } from "./library/context";
import { isElementNode, listOf, textOf } from "./library/context";
import { programDrawers } from "./library/registry";

/** One drawn component, keyed by the statement it came from. */
function keyOf(value: unknown, index: number): string {
  const statement = (value as { statementId?: unknown }).statementId;
  return typeof statement === "string" && statement !== ""
    ? `${statement}-${String(index)}`
    : `${String(index)}`;
}

export function ProgramScreen(props: { name: string }): JSX.Element | null {
  const t = useAdwaita();
  const record = useProgram(props.name);
  const paint = useProgramPaint(record);

  if (record === undefined || paint?.root == null) {
    return (
      <div style={{ display: "flex", padding: screenPad(t) }}>
        <T size="caption" color={programTextColor(t, "muted")} style={{ minWidth: 0 }}>
          {record === undefined
            ? NOT_DRAWN_NOTE
            : "nothing drew: the program has no root that this library can name"}
        </T>
      </div>
    );
  }

  const values = programStore.valuesOf(record);
  const formState = (): Record<string, unknown> | undefined =>
    Object.keys(values).length === 0 ? undefined : values;

  const ctx: ProgramContext = {
    t,
    node: (value: unknown) => draw(value, 0),
    nodes: (values: unknown) =>
      listOf(values)
        .map((entry, index) => draw(entry, index))
        .filter((entry) => entry !== null),
    binding: <Value,>(value: unknown, fallback: Value): ProgramBinding<Value> => {
      if (isReactiveAssign(value)) {
        const target = value.target;
        const held = values[target];
        return {
          name: target,
          value: (held === undefined || held === null ? fallback : held) as Value,
          set: (next: Value) => programStore.setValue(record.name, target, next),
        };
      }
      return {
        name: "",
        value: (value === undefined || value === null ? fallback : value) as Value,
        set: () => {},
      };
    },
    fire: (event) => programStore.pushEvent(record.name, { at: Date.now(), ...event }),
    act: (steps, label) => {
      const outcome = runActionSteps(record.name, steps, values);
      programStore.pushEvent(record.name, {
        at: Date.now(),
        type: "click",
        message: label,
        params: outcome.set.length === 0 ? {} : { changed: outcome.set },
        formState: formState(),
      });
      for (const asked of outcome.asked)
        programStore.pushEvent(record.name, {
          at: Date.now(),
          type: asked.type,
          message: asked.message,
          params: asked.params,
          formState: formState(),
        });
    },
    formState,
    keyOf,
  };

  function draw(value: unknown, index: number): JSX.Element | null {
    const text = textOf(value);
    if (text !== null)
      return (
        <T key={keyOf(value, index)} size="body" color={t.color.text.primary} clamp={4} style={{ minWidth: 0, flexShrink: 1 }}>
          {text}
        </T>
      );

    if (!isElementNode(value)) return null;
    const node = value as ElementNode;
    const drawer = programDrawers[node.typeName];
    if (drawer === undefined)
      return (
        <T key={keyOf(node, index)} size="caption" color={programTextColor(t, "warning")} style={{ minWidth: 0 }}>
          {`no component named ${node.typeName} in this library`}
        </T>
      );

    return <div key={keyOf(node, index)} style={{ display: "flex", minWidth: 0, flexGrow: 1 }}>{drawer(node, ctx)}</div>;
  }

  const unresolved = record.parse.unresolved;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        padding: screenPad(t),
        gap: unresolved.length === 0 ? 0 : programGap(t, 2),
        borderRadius: paneRadius(t),
        borderWidth: unresolved.length === 0 ? 0 : HAIRLINE,
        borderColor: programEdge(t, unresolved.length === 0 ? null : "warning"),
      }}
    >
      {unresolved.length === 0 ? null : (
        <T size="caption" color={programTextColor(t, "warning")} clamp={2} style={{ minWidth: 0 }}>
          {`unresolved: ${unresolved.join(", ")}`}
        </T>
      )}
      {draw(paint.root, 0)}
    </div>
  );
}

