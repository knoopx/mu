export interface KeybindingDefinition {
  id: string;
  key: string;
  description: string;
}
export type KeybindingDefinitions = Record<string, KeybindingDefinition[]>;
export interface KeybindingConflict {
  id: string;
  key: string;
  with: string;
}

function def(
  id: string,
  key: string,
  description: string,
): KeybindingDefinition {
  return { id, key, description };
}

export const APP_KEYBINDINGS: KeybindingDefinitions = {
  editor: [
    def("editor.submit", "enter", "Submit the editor"),
    def("editor.newline", "alt+enter", "Insert a new line"),
    def("editor.autocomplete", "tab", "Trigger autocomplete"),
    def("editor.deleteToLineStart", "ctrl+u", "Delete to start of line"),
    def("editor.deleteWordBackward", "ctrl+w", "Delete word backward"),
    def("editor.deleteWordForward", "alt+d", "Delete word forward"),
    def("editor.lineStart", "ctrl+a", "Move to line start"),
    def("editor.lineEnd", "ctrl+e", "Move to line end"),
    def("editor.jumpForward", "ctrl+]", "Jump forward to character"),
    def("editor.jumpBackward", "ctrl+alt+]", "Jump backward to character"),
  ],
  input: [
    def("input.submit", "enter", "Submit"),
    def("input.lineStart", "ctrl+a", "Move to line start"),
    def("input.lineEnd", "ctrl+e", "Move to line end"),
    def("input.deleteWordBackward", "ctrl+w", "Delete word backward"),
    def("input.deleteToLineStart", "ctrl+u", "Delete to start of line"),
  ],
  list: [
    def("list.select", "enter", "Select the highlighted item"),
    def("list.cancel", "escape", "Cancel"),
  ],
  composer: [
    def("composer.commands", "ctrl+shift+p", "Open the command composer"),
    def("composer.models", "ctrl+l", "Open the model composer"),
    def("composer.thinking", "ctrl+t", "Open the thinking composer"),
    def(
      "composer.sessions",
      "ctrl+h",
      "Open the project session history composer",
    ),
    def(
      "composer.deleteRow",
      "delete",
      "Delete the highlighted row in a composer panel that can delete one",
    ),
    def("composer.files", "ctrl+p", "Open the file composer"),
    def(
      "composer.openRow",
      "o",
      "Open the highlighted file in the desktop's default app in the file composer panel",
    ),
    def(
      "composer.editRow",
      "e",
      "Open the highlighted file in the editor in the file composer panel",
    ),
    def(
      "composer.userMessageHistory",
      "ctrl+r",
      "Reverse search the user message history of this session",
    ),
    def(
      "composer.paste",
      "ctrl+v",
      "Paste an image from the clipboard into the composer",
    ),
    def(
      "composer.clear",
      "ctrl+c",
      "Clear the composer draft (text and attachments)",
    ),
    def("composer.changes", "ctrl+k", "Open the changes composer panel"),
    def(
      "composer.oplog",
      "ctrl+o",
      "Open the repo operation log composer panel",
    ),
    def(
      "composer.guardrails",
      "ctrl+shift+g",
      "Open the guardrails composer panel",
    ),
    def("composer.tree", "ctrl+shift+t", "Open the session history tree"),
    def(
      "composer.plugins",
      "ctrl+shift+a",
      "Open the plugins panel (what this build is made of)",
    ),
    def(
      "composer.projects",
      "ctrl+shift+j",
      "Open the projects composer panel and start a window in another folder",
    ),
    def(
      "composer.terminal",
      "ctrl+shift+enter",
      "Open the terminal composer panel",
    ),
    def(
      "composer.terminalPaste",
      "ctrl+shift+v",
      "Paste text into the terminal composer panel",
    ),
    def(
      "composer.theme",
      "ctrl+,",
      "Open the theme composer with a live preview",
    ),
    def(
      "composer.accent",
      "ctrl+shift+,",
      "Open the accent composer with a live preview",
    ),
  ],
  transcript: [
    def(
      "transcript.prevPoint",
      "ctrl+pageup",
      "Scroll to the previous conversation point",
    ),
    def(
      "transcript.nextPoint",
      "ctrl+pagedown",
      "Scroll to the next conversation point",
    ),
    def("transcript.start", "ctrl+home", "Scroll to the start of the log"),
    def("transcript.end", "ctrl+end", "Scroll to the end of the log"),
  ],
  ui: [
    def(
      "ui.newWindow",
      "ctrl+shift+n",
      "Open a new window in the same workspace",
    ),
    def("ui.newSession", "ctrl+n", "Start a new agent session"),
    def("ui.debug", "ctrl+shift+d", "Global debug toggle"),
    def("ui.cycleSettings", "space", "Cycle value of the selected setting"),
  ],
};
