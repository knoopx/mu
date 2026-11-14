/**
 * What the composer hands a panel.
 *
 * A panel is not given a bag of everything the window holds by accident: these are
 * the read-only facts of the composer itself — the draft, the query, the mode, the
 * window's size, the actions a row can be picked with — and the state a panel built
 * for itself, held by the target that owns it and handed back to the surface that
 * produced it. What a panel _does_ with them is the plugin's business: it makes its
 * own state, returns a `PanelView` (`core/lib/plugin/manifest.ts`), and core draws
 * that.
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
import type { ComposerMode, ComposerTarget, PickIntent } from "./mode";
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
  tree: SessionTreeApi;
  /**
   * The state each open panel built for itself, by the target that owns it.
   *
   * Core hands it back to the surface that made it and never reads it: a plugin's
   * panel state is its own type, in its own file, and this bag names none of them.
   */
  panelState: ReadonlyMap<ComposerTarget, unknown>;
  previewFor(path: string): ComposerPreviewSpec;
  windowHeight: number | undefined;
  onPick: (row: ComposerPanelRow, intent: PickIntent) => void;
  onDelete: (row: ComposerPanelRow) => void;
  onOpen: (row: ComposerPanelRow) => void;
  onEdit: (row: ComposerPanelRow) => void;
  onHover: (mode: ComposerMode, index: number, count: number) => void;
}
