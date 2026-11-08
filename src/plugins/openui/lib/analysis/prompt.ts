/**
 * The reference `openui-prompt` answers with.
 *
 * mu authors no prompt text. What `openui-prompt` answers with is lang-core's
 * own syntax rules over this app's component signatures, and nothing else: no
 * rules of mu's, no worked examples, and the library's group notes emptied on
 * the way in, since those notes are style opinions dressed as API facts. What
 * may be named, and what a component takes, stays the same answer the parser,
 * `openui-library` and the renderer give — they all read `librarySpec`, which
 * this file only narrows for the prompt.
 *
 * The notes and examples stay where they are documentation: `openui-library`
 * still prints a group's notes beside the components it lists. They are simply
 * no longer handed to a model as instructions before it writes.
 */

import { generateSystemPrompt, type PromptSpec } from "@openuidev/lang-core";

import { librarySpec } from "../schema/library";

/** The library as the reference may speak it: groups and signatures, no prose. */
function referenceSpec(): PromptSpec {
  return {
    ...librarySpec,
    componentGroups: (librarySpec.componentGroups ?? []).map((group) => ({
      ...group,
      notes: [],
    })),
  };
}

export interface PromptBuild {
  preamble: string;
  tools: string[];
  /** Snippets the call brings with it. Empty means the reference carries none. */
  examples: string[];
  editMode: boolean;
}

/** The reference the `openui-prompt` tool answers with. */
export function buildLanguagePrompt(build: PromptBuild): string {
  return generateSystemPrompt({
    library: referenceSpec(),
    promptOptions: {
      ...(build.preamble === "" ? {} : { preamble: build.preamble }),
      bindings: true,
      toolCalls: build.tools.length > 0,
      builtinFunctions: true,
      editMode: build.editMode,
      ...(build.tools.length === 0 ? {} : { tools: build.tools }),
      // An empty array suppresses every example: lang-core reads
      // `spec.examples ?? []`, so nothing is pushed and no section is opened.
      examples: build.examples,
    },
  });
}
