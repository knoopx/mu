/**
 * A file's text.
 *
 * A file answers with its text and nothing above it: the tool header already names
 * the path and the repository it was read out of, so a card that opens with them
 * again says them twice, and a size printed over the thing whose size it is repeats
 * what the reader is about to look at. What the card cannot show — how long the file
 * is and where the log stops painting it — rides the header's tail instead, in the
 * horizontal room the text does not use. The model keeps the same two numbers in its
 * table.
 */

import { fieldNamed, recordColumns } from "./contract";
import { fileLengthWord } from "../format";
import type { GithubKindWords } from "./contract";

export const fileWords: GithubKindWords = {
  unit: "result",
  target: "",
  running: "reading the file",
  emptyShort: "empty file",
  emptyNote: (call) => `${call.path} is an empty file`,
  columns: recordColumns,
  title: () => "",
  // Only a read that came back with nothing prints this, and there the header has
  // given up the path to say the file was empty — so the path is the card's to say.
  facts: () => [],
  headerFacts: (call) => [
    fileLengthWord(call.body, fieldNamed(call, "lines")),
    fieldNamed(call, "size"),
  ],
  state: () => null,
  body: "code",
};
