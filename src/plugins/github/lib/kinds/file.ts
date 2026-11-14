/**
 * A file's text.
 *
 * A file answers with its text and nothing else: no figures and no title above the
 * panel, because a size printed over the thing whose size it is repeats what the
 * reader is already looking at, and an icon does not make it a fact. The cut belongs
 * to the panel that shows it. The size and the line count are the model's, in its
 * table.
 */

import { fact, fieldNamed, identityOf, recordColumns } from "./contract";
import type { GithubKindWords } from "./contract";

export const fileWords: GithubKindWords = {
  unit: "result",
  target: "",
  running: "reading the file",
  emptyShort: "empty file",
  emptyNote: (call) => `${call.path} is an empty file`,
  columns: recordColumns,
  title: () => "",
  // A file is named by its path, and the repository it came from is the line under
  // it — there is no header above the card any more, so the card has to say where
  // the file is.
  identity: (call) => identityOf(call, call.path, "description"),
  facts: (call) => [
    fact("size", fieldNamed(call, "size"), { figure: true }),
    fact("lines", fieldNamed(call, "lines"), { figure: true }),
  ],
  state: () => null,
  body: "code",
};
