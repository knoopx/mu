/**
 * Drawing a program in the log.
 *
 * This is the renderer: it evaluates the parse the store holds, walks the tree
 * through this app's library, and hands every component the context it needs to
 * read a `$variable`, change one, and answer the question it stands next to. A
 * program that is no longer in the store says so — the row that drew it stays in
 * the conversation as the record that it was drawn.
 *
 * Two things the reference plugin does and a plain renderer would not: a child
 * is given the path it stands at, because that path is the only identity a
 * drawn question has — it is what stages the answer, what re-stages it when a
 * field changes, and what folds it once the answer has gone out; and once the
 * screen is painted, every `Form` the human has touched has its answers written
 * into the sheet, as one `Label: answer` line per field.
 */

import { useEffect } from "react";
import type { JSX } from "react";
import { isReactiveAssign, type ElementNode } from "@openuidev/lang-core";
import { T, useAdwaita } from "adwaita-gpuix";

import {
  MAX_FAILURE_NOTES,
  NOT_DRAWN_NOTE,
  TYPED_ANSWER_MS,
} from "../constants";
import { useProgram } from "../hooks/useProgram";
import { useProgramPaint } from "../hooks/useProgramPaint";
import { formsOf, childPath, segmentOf } from "../lib/analysis/tree";
import { coerce } from "./library/coerce";
import { runActionSteps } from "../lib/analysis/run";
import { answerSheet } from "../lib/answer/store";
import { formFields, formMessage } from "../lib/answer/form";
import { formPosition } from "../lib/answer/positions";
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
const keyOf = (value: unknown, index: number): string => segmentOf(value, index);

export function ProgramScreen(props: {
  name: string;

  /** The reply this screen stands in has already been answered: its questions have gone out. */
  answered?: boolean;
}): JSX.Element | null {
  const t = useAdwaita();
  const record = useProgram(props.name);
  const paint = useProgramPaint(record);
  const answered = props.answered === true;

  const name = record?.name ?? "";
  const values = record === undefined ? {} : programStore.valuesOf(record);

  // A form the human has touched has answered the question it asks; its answer
  // is its fields, read as the screen holds them now. This runs after the paint,
  // because the sheet is a store and a store may not be written from a render.
  //
  // A form with a field the person types into waits for a pause in the typing:
  // its answer is a line in their message, and rewriting that line on every
  // keystroke would be rewriting the draft under their hands.
  useEffect(() => {
    if (record === undefined || paint?.root == null || answered) return;
    const held = programStore.valuesOf(record);
    const read = (variable: string): unknown => held[variable] ?? null;
    const waiting: ReturnType<typeof setTimeout>[] = [];
    for (const form of formsOf(paint.root)) {
      const fields = formFields(form.node, read);
      if (fields.length === 0) continue;
      if (!fields.some((field) => record.touched.has(field.name))) continue;
      const position = formPosition(form.path);
      const next = formMessage(form.node, read);
      if (answerSheet.stagedText(record.name, position) === next) continue;
      const typed = fields.some((field) => field.typed);
      if (!typed || answerSheet.stagedText(record.name, position) === "") {
        answerSheet.stage(record.name, position, next);
        continue;
      }
      waiting.push(setTimeout(() => answerSheet.stage(record.name, position, next), TYPED_ANSWER_MS));
    }
    return () => {
      for (const timer of waiting) clearTimeout(timer);
    };
  }, [paint, record, answered]);

  if (record === undefined || paint?.root == null) {
    // A block that drew nothing says why. While a reply streams the parse is a
    // prefix and its complaints are provisional, so the words wait until the
    // block is as final as it is going to get.
    const hard = (record?.parse.diagnostics ?? []).filter(
      (diagnostic) => diagnostic.severity === "error",
    );
    const settled = record !== undefined && !record.streaming && !record.parse.incomplete;
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: screenPad(t),
          gap: programGap(t, 1),
          minWidth: 0,
        }}
      >
        <T size="caption" color={programTextColor(t, "muted")} style={{ minWidth: 0 }}>
          {record === undefined
            ? NOT_DRAWN_NOTE
            : "nothing drew: the program has no root that this library can name"}
        </T>
        {!settled
          ? null
          : hard.slice(0, MAX_FAILURE_NOTES).map((diagnostic, index) => (
              <T
                key={`${diagnostic.code}-${String(index)}`}
                size="caption"
                color={programTextColor(t, "warning")}
                clamp={2}
                style={{ minWidth: 0 }}
              >
                {diagnostic.message}
              </T>
            ))}
      </div>
    );
  }

  const formState = (): Record<string, unknown> | undefined =>
    Object.keys(values).length === 0 ? undefined : values;

  const ctx: ProgramContext = {
    t,
    block: name,
    path: "",
    group: "",
    answered,
    node: (value: unknown) => draw(value, 0, ctx),
    nodes: (children: unknown) =>
      listOf(children)
        .map((entry, index) => draw(entry, index, ctx))
        .filter((entry) => entry !== null),
    binding: <Value,>(value: unknown, fallback: Value): ProgramBinding<Value> => {
      if (isReactiveAssign(value)) {
        const target = value.target;
        const held = values[target];
        return {
          name: target,
          // A value that converts without loss is read as the shape the input
          // needs: a `$seats` the program wrote as "12", or a query that answered
          // with a string, is still a slider's number.
          value: (held === undefined || held === null ? fallback : coerce(held, fallback)) as Value,
          set: (next: Value) => programStore.setValue(name, target, next),
        };
      }
      return {
        name: "",
        value: (value === undefined || value === null ? fallback : value) as Value,
        set: () => {},
      };
    },
    // What the human did to an input stays on the page: an input outside a form
    // is a what-if, not an answer, and the agent reads it from the program's
    // state with `openui-state` if it wants it. Only a question that asks for a
    // reply — a button, a submitted form — goes anywhere.
    fire: (event) => programStore.pushEvent(name, { at: Date.now(), ...event }),
    act: (steps, label) => {
      const outcome = runActionSteps(name, steps, values);
      programStore.pushEvent(name, {
        at: Date.now(),
        type: "click",
        message: label,
        params:
          outcome.set.length === 0 && outcome.ran.length === 0
            ? {}
            : { changed: outcome.set, ran: outcome.ran },
        formState: formState(),
      });
      for (const ran of outcome.ran)
        programStore.pushEvent(name, {
          at: Date.now(),
          type: "run",
          message: `ran ${ran}`,
          params: { statementId: ran },
          formState: formState(),
        });
      for (const asked of outcome.asked)
        programStore.pushEvent(name, {
          at: Date.now(),
          type: asked.type,
          message: asked.message,
          params: asked.params,
          formState: formState(),
        });
    },
    formState,
    keyOf,
    stage: (position: string, text: string) => answerSheet.stage(name, position, text),
    staged: (position: string) => answerSheet.stagedText(name, position),
    sentAnswer: (position: string) => answerSheet.sentText(name, position),
  };

  function draw(value: unknown, index: number, parent: ProgramContext): JSX.Element | null {
    const path = childPath(parent.path, value, index);
    const child = { ...parent, path, group: parent.path };

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

    return <div key={keyOf(node, index)} style={{ display: "flex", minWidth: 0, flexGrow: 1 }}>{drawer(node, child)}</div>;
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
      {draw(paint.root, 0, ctx)}
    </div>
  );
}
