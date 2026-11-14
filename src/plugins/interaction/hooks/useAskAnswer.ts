/**
 * The answering state of one question.
 *
 * The question panel is a cursor over a filtered list, a set of boxes ticked for
 * a multiple-choice question, and three modes — picking, answering in your own
 * words, and adding a note to a pick. All of that is state rather than drawing,
 * so it lives here and `AskComposer` only paints what it returns: a change to
 * how an answer is staged moves this file, and a change to how a question looks
 * moves the component.
 *
 * The two rules the panel is built on are here too: a question's own state ends
 * with the question (a new `question.id` resets every draft and every tick), and
 * an answer is only ever handed to `onAnswer` once it says something — an empty
 * draft or a send with nothing picked does nothing at all.
 */
import { useEffect, useState } from "react";
import { windowRows } from "../../core/lib/composer/mode";
import { fuzzyFilter } from "../../../fuzzy";
import {
  createFreeformResponse,
  createSelectionResponse,
} from "../lib/normalize";
import type { AskMode, AskRequest, AskResponse, AskRow } from "../types";

export interface AskAnswerOptions {
  request: AskRequest;

  initialMode?: AskMode;

  onAnswer: (response: AskResponse) => void;

  onCancel: () => void;

  /** How many rows the band the panel stands in can show at once. */
  maxVisibleRows: number;
}

export interface AskAnswer {
  /** Picking, answering in one's own words, or adding a note to a pick. */
  mode: AskMode;

  freeformOnly: boolean;
  allowMultiple: boolean;

  /** The words filtering the list. */
  query: string;

  /** The options the filter leaves, in the list's own numbering. */
  rows: AskRow[];

  /** The slice of the list the band shows, and where it starts. */
  window: { visible: AskRow[]; start: number; end: number };

  activeIndex: number;
  activeRow: AskRow | undefined;

  /** Which option the cursor stands on, in the question's own numbering; -1 for none. */
  activeOptionIndex: number;

  checked: Set<number>;
  checkedCount: number;

  /** The labels a note is being added to — the answer the comment pane rides on. */
  selections: string[];

  /** The labels an answer would carry: the ticked ones, or the row under the cursor. */
  titles: string[];

  /** The list is drawn unless the answer is being typed instead. */
  showList: boolean;

  /** The draft of whichever pane the mode shows. */
  draft: string;

  setQuery(text: string): void;
  setDraft(text: string): void;
  setCursor(at: number): void;
  setMode(mode: AskMode): void;
  move(delta: number): void;
  jumpTo(target: number): void;
  activate(): void;
  acceptAt(at: number): void;
  toggleActive(): boolean;
  submitChecked(): void;
  submitText(): void;
  toggleComment(): void;

  /** Escape drops the filter first, and only then the question. */
  escape(): void;
}

export function useAskAnswer(options: AskAnswerOptions): AskAnswer {
  const { request, initialMode, onAnswer, onCancel, maxVisibleRows } = options;
  const { question } = request;
  const allowMultiple = question.allowMultiple;
  const freeformOnly = question.options.length === 0;

  const [cursor, setCursor] = useState(0);
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [mode, setMode] = useState<AskMode>(
    () => initialMode ?? (freeformOnly ? "freeform" : "select"),
  );
  const [freeformDraft, setFreeformDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [selections, setSelections] = useState<string[]>([]);

  // A new question is a new answer: nothing carries over from the one before it.
  useEffect(() => {
    setCursor(0);
    setQuery("");
    setChecked(new Set());
    setFreeformDraft("");
    setCommentDraft("");
    setSelections([]);
    setMode(initialMode ?? (freeformOnly ? "freeform" : "select"));
  }, [question.id, initialMode, freeformOnly]);

  const filtered =
    query.trim().length === 0
      ? question.options
      : fuzzyFilter(
          question.options,
          query.trim(),
          (option) => `${option.label} ${option.description ?? ""}`,
        );

  const rows: AskRow[] = filtered.map((option): AskRow => ({
    kind: "option",
    option,
    optionIndex: question.options.indexOf(option),
  }));

  const activeIndex = rows.length === 0 ? 0 : Math.min(cursor, rows.length - 1);
  const activeRow = rows[activeIndex];
  const activeOptionIndex =
    activeRow !== undefined && activeRow.kind === "option"
      ? activeRow.optionIndex
      : -1;

  const move = (delta: number): void => {
    if (rows.length === 0) return;
    const count = rows.length;
    setCursor((prev) => {
      const at = Math.min(prev, count - 1);
      const next = at + delta;
      return next < 0 ? count - 1 : next >= count ? 0 : next;
    });
  };

  const jumpTo = (target: number): void => {
    if (rows.length === 0) return;
    setCursor(Math.max(0, Math.min(target, rows.length - 1)));
  };

  const titlesOf = (indices: Iterable<number>): string[] =>
    Array.from(indices)
      .sort((a, b) => a - b)
      .map((i) => question.options[i]?.label)
      .filter((title): title is string => title !== undefined);

  const submitTitles = (titles: string[]): void => {
    if (titles.length === 0) return;
    const response = createSelectionResponse(titles);
    if (response !== null) onAnswer(response);
  };

  const toggleOption = (optionIndex: number): void => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(optionIndex)) next.delete(optionIndex);
      else next.add(optionIndex);
      return next;
    });
  };

  const toggleActive = (): boolean => {
    const row = rows[activeIndex];
    if (row === undefined || row.kind !== "option") return false;
    toggleOption(row.optionIndex);
    return true;
  };

  const acceptAt = (at: number): void => {
    const row = rows[at];
    if (row === undefined || row.kind !== "option") return;
    // A multiple-choice question never answers on a click: it ticks the box.
    if (allowMultiple) {
      toggleOption(row.optionIndex);
      return;
    }
    submitTitles([row.option.label]);
  };

  // An answer carries what was ticked; with nothing ticked it carries the row
  // the cursor stands on.
  const checkedTitles = titlesOf(checked);
  const titles =
    checkedTitles.length > 0
      ? checkedTitles
      : activeOptionIndex >= 0
        ? titlesOf([activeOptionIndex])
        : [];

  const activate = (): void => {
    if (allowMultiple) {
      submitTitles(titles);
      return;
    }
    acceptAt(activeIndex);
  };

  const submitChecked = (): void => submitTitles(checkedTitles);

  const submitText = (): void => {
    const response =
      mode === "freeform"
        ? createFreeformResponse(freeformDraft)
        : createSelectionResponse(selections, commentDraft);
    if (response !== null) onAnswer(response);
  };

  const toggleComment = (): void => {
    if (mode === "comment") {
      setMode("select");
      return;
    }
    // A note rides an answer, so there has to be one to ride on.
    if (titles.length === 0) return;
    setSelections(titles);
    setMode("comment");
  };

  const escape = (): void => {
    if (query.length > 0) {
      setQuery("");
      return;
    }
    onCancel();
  };

  return {
    mode,
    freeformOnly,
    allowMultiple,
    query,
    rows,
    window: windowRows(rows, activeIndex, maxVisibleRows),
    activeIndex,
    activeRow,
    activeOptionIndex,
    checked,
    checkedCount: checked.size,
    selections,
    titles,
    showList: mode === "select" && !freeformOnly,
    draft: mode === "freeform" ? freeformDraft : commentDraft,
    setQuery,
    setDraft: (text: string): void =>
      mode === "freeform" ? setFreeformDraft(text) : setCommentDraft(text),
    setCursor,
    setMode,
    move,
    jumpTo,
    activate,
    acceptAt,
    toggleActive,
    submitChecked,
    submitText,
    toggleComment,
    escape,
  };
}
