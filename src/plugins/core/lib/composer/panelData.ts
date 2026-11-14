/**
 * What the composer hands a panel.
 *
 * A panel is not given a bag of everything the window holds by accident: these are
 * the read-only facts of the composer itself — the draft, the query, the mode, the
 * window's size, the actions a row can be picked with — and the state a plugin's
 * own panel hook produced for it. What a panel _does_ with them is the plugin's
 * business: it picks the fields it owns and returns a `PanelView`
 * (`core/lib/plugin/manifest.ts`), and core draws that.
 */

import type { AdwaitaTheme } from "adwaita-gpuix";
import type { SlashCommand } from "../../../../autocomplete";
import type {
  ComposerPanelRow,
  ComposerPreviewSpec,
} from "../../components/composer/Composer";
import type { ChatSession } from "../session/chatSession";
import type { SessionListRow } from "../session/sessionList";
import type { SessionTreeApi } from "../../hooks/useSessionTree";
import type { ThemePanelState } from "../../hooks/useThemePanel";
import type { GuardrailsPanelApi } from "../../../guardrails/types";
import type { TerminalPanelState } from "../../../terminal/types";
import type { ChangesPanelState } from "../../../vcs/hooks/useChangesPanel";
import type { OplogPanelState } from "../../../vcs/hooks/useOplogPanel";
import type { ComposerMode, PickIntent } from "./mode";
import type { UserMessage } from "./userMessageHistory";

export interface ComposerPanelData {
  cwd: string;
  theme: AdwaitaTheme;
  mode: ComposerMode;
  query: string;
  commands: readonly SlashCommand[];
  session: ChatSession | null;
  themePanel: ThemePanelState;
  sessionRows: readonly SessionListRow[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  userMessages: readonly UserMessage[];
  userMessagesLoading: boolean;
  userMessagesError: string | null;
  changes: ChangesPanelState;
  oplog: OplogPanelState;
  tree: SessionTreeApi;
  guardrails: GuardrailsPanelApi;
  terminal: TerminalPanelState;
  previewFor(path: string): ComposerPreviewSpec;
  windowHeight: number | undefined;
  onPick: (row: ComposerPanelRow, intent: PickIntent) => void;
  onDelete: (row: ComposerPanelRow) => void;
  onOpen: (row: ComposerPanelRow) => void;
  onEdit: (row: ComposerPanelRow) => void;
  onHover: (mode: ComposerMode, index: number, count: number) => void;
}
