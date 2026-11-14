/**
 * Keeping the answer sheet in the draft.
 *
 * The sheet is a store and the draft is React state, and the draft belongs to
 * the person: they type beside the answers, delete them, paste them somewhere
 * else. So neither side owns the text — the effect below reconciles them on
 * every change in either direction.
 *
 * A draft change the sheet did not make is followed with `noteDraft`, which
 * tracks the sheet's block by aligning the draft before and after: a change
 * beside the block moves it, a change inside it hands it over as the person's
 * own text, and a change that removed it takes those answers out, because the
 * draft is the truth about what will be sent. A draft change the sheet *did*
 * make is recognised by the text it recorded and not re-tracked.
 */

import { useEffect, useSyncExternalStore } from "react";

import type { ComposerState } from "../../core/hooks/useComposerState";
import { writeBlock } from "../lib/answer/sheet";
import { answerSheet } from "../lib/answer/store";

/** The sheet's version: every staged answer bumps it. */
function useAnswerSheetVersion(): number {
  return useSyncExternalStore(
    answerSheet.subscribe,
    answerSheet.getSnapshot,
    answerSheet.getSnapshot,
  );
}

/** Hold the staged answers in the draft, without ever touching what the person wrote. */
export function useAnswerSheet(composer: ComposerState): void {
  const version = useAnswerSheetVersion();
  const input = composer.input;
  const setInput = composer.setInput;

  useEffect(() => {
    if (input !== answerSheet.lastDraft) answerSheet.noteDraft(input);

    const wanted = answerSheet.text();
    const written = writeBlock(input, answerSheet.at, wanted);
    if (written === null) return;

    answerSheet.noteWritten(wanted ?? "", written.at);
    answerSheet.lastDraft = written.text;
    setInput(written.text);
  }, [input, version, setInput]);
}
