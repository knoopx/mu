/**
 * The composer band, and the panel that is open in it.
 *
 * A panel is the app's most interacted-with surface: one line of ink per row, a
 * place column so names line up, a hint line that prints only the keys the panel
 * actually takes, a cursor that moves on arrows, and a pick that means something
 * different in every panel. None of that needs a transcript above it, so no
 * transcript is drawn here — the composer stands alone, with the app's own panel
 * chrome, the app's own surfaces, and the app's own key routing.
 *
 * The stage is deliberately the window's own wiring, minus the log:
 * `composerPanelSpec` frames the panel the way core frames it, every registered
 * surface builds its state through its own hook exactly as `useChatPanels` does,
 * and `Composer` runs `useComposerKeys` itself, so a keystroke sent to the stage
 * is routed by the same router the window uses.
 */

import { useState, type Dispatch, type JSX, type SetStateAction } from "react";
import { useWindowSize } from "@gpuix/react";
import { useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import type { SlashCommand } from "../../src/autocomplete";
import { Composer } from "../../src/plugins/core/components/composer/Composer";
import type {
  ComposerContextSpec,
  ComposerPanelRow,
  ComposerPreviewSpec,
} from "../../src/plugins/core/components/composer/Composer";
import {
  composerPanelRows,
  composerPanelSpec,
} from "../../src/plugins/core/components/composer/panels";
import { HOST } from "../../src/plugins/registry";
import {
  commandSurfaces,
  panelSurfaces,
} from "../../src/plugins/core/lib/plugin/surfaces";
import { pickComposerRow } from "../../src/plugins/core/lib/composer/panelActions";
import {
  panelQuery,
  type ComposerMode,
  type ComposerTarget,
  type PickIntent,
} from "../../src/plugins/core/lib/composer/mode";
import type { ComposerPanelData } from "../../src/plugins/core/lib/composer/panelData";
import type { UserMessage } from "../../src/plugins/core/lib/composer/userMessageHistory";
import type { ThinkingLevel } from "../../src/plugins/core/lib/agent/agentService";
import type { ChatSession } from "../../src/plugins/core/lib/session/chatSession";
import type {
  SessionListRow,
  SessionPreviewData,
} from "../../src/plugins/core/lib/session/sessionList";
import type { TreeSnapshot } from "../../src/plugins/core/lib/session/chatSession";
import type { TreeRow } from "../../src/plugins/core/lib/session/sessionTree";
import { useSessionTree } from "../../src/plugins/core/hooks/useSessionTree";
import { useThemePanel } from "../../src/plugins/core/hooks/useThemePanel";
import { stubChatSession } from "../chatSource";
import { stage, type Screen, type StageOptions } from "../harness";

/** What a row's pick, delete, open or edit did. */
export interface PanelSpy {
  picks: { key: string; label: string; intent: PickIntent }[];
  deletes: string[];
  opens: string[];
  edits: string[];
  hovers: number[];
  modes: ComposerMode[];
  sent: string[];
  completed: number;
  aborted: number;
  histories: number;

  /** what a pick asked the app to do, once the app's own routing ran */
  models: string[];
  thinking: string[];
  resumes: string[];
  commands: string[];
  system: string[];
}

export const newSpy = (): PanelSpy => ({
  picks: [],
  deletes: [],
  opens: [],
  edits: [],
  hovers: [],
  modes: [],
  sent: [],
  completed: 0,
  aborted: 0,
  histories: 0,
  models: [],
  thinking: [],
  resumes: [],
  commands: [],
  system: [],
});

export interface ComposerScene {
  mode: ComposerMode;
  value?: string;

  cwd?: string;

  /** the session whose model and thinking lists a panel reads */
  session?: ChatSession;

  commands?: readonly SlashCommand[];
  sessionRows?: readonly SessionListRow[];
  sessionPreviews?: Record<string, SessionPreviewData>;
  userMessages?: readonly UserMessage[];
  tree?: TreeSnapshot | null;

  /** the pane beside a list's rows, for the row under the cursor */
  previewFor?: (path: string) => ComposerPreviewSpec;

  spy?: PanelSpy;

  isStreaming?: boolean;
  model?: string | null;
  thinking?: string | null;
  context?: ComposerContextSpec | null;
  placeholder?: string;
}

const rowLabel = (row: ComposerPanelRow): string => {
  const record = row as unknown as {
    name?: string;
    label?: string;
    key?: string;
  };
  return record.name ?? record.label ?? record.key ?? "";
};

/**
 * Everything a staged panel is built from.
 *
 * The three parts of the stage — its panels, its pick routing, its data bag — each
 * need most of what the scene gives the composer, so they take one bag rather than
 * a list that grows every time the window learns a new key.
 */
interface StageParts {
  props: ComposerScene;
  theme: AdwaitaTheme;
  size: ReturnType<typeof useWindowSize>;
  mode: ComposerMode;
  session: ChatSession;
  themePanel: ComposerPanelData["themePanel"];
  panelState: Map<ComposerTarget, unknown>;
  spy: PanelSpy;
  tree: ReturnType<typeof useSessionTree>;
  setValue: Dispatch<SetStateAction<string>>;
  setMode: Dispatch<SetStateAction<ComposerMode>>;
}

const stageCwd = (props: ComposerScene): string => props.cwd ?? process.cwd();

/**
 * Every panel's own state, built through that surface's own hook in registration
 * order — the same loop `useChatPanels` runs, and sound for the same reason: the
 * panel list is the host's and is fixed once the plugins are loaded.
 */
function useStagePanels(
  props: ComposerScene,
  mode: ComposerMode,
  size: ReturnType<typeof useWindowSize>,
  setValue: (text: string) => void,
  spy: PanelSpy,
): Map<ComposerTarget, unknown> {
  const panelState = new Map<ComposerTarget, unknown>();
  for (const surface of panelSurfaces(HOST)) {
    if (surface.use === undefined) continue;
    panelState.set(
      surface.target,
      surface.use({
        cwd: stageCwd(props),
        toast: (message: string): string => message,
        query: panelQuery(mode),
        open: mode.kind === "pick" && mode.target === surface.target,
        windowWidth: size?.width,
        windowHeight: size?.height,
        actions: {
          pickText: (text) => {
            setValue(text);
          },
          sendInstruction: (text) => {
            spy.sent.push(text);
          },
        },
      }),
    );
  }
  return panelState;
}

/**
 * The window's own pick routing, with the stage's side of it.
 *
 * A pick goes through `pickComposerRow`, not a stub: the model panel picks a
 * model, a completion writes the draft, a guardrail row flips a switch, and a
 * panel that means its pick closes itself. That routing is the half of a panel a
 * reader feels, and a stage that skipped it would test the drawing only. Every
 * write the window is asked for lands on the spy, so a test asserts on the ask.
 */
function stageActions(parts: StageParts) {
  const { mode, themePanel, panelState, spy, setValue, setMode } = parts;
  return {
    mode,
    toast: (message: string): string => message,
    setInput: (text: string) => setValue(text),
    appendInput: (text: string) => setValue((prev) => prev + text),
    setMode: (next: ComposerMode) => {
      spy.modes.push(next);
      setMode(next);
    },
    themePanel,
    runCommand: (name: string) => {
      spy.commands.push(name);
    },
    system: (text: string) => {
      spy.system.push(text);
    },
    setModel: (ref: string) => {
      spy.models.push(ref);
    },
    setThinking: (level: ThinkingLevel) => {
      spy.thinking.push(String(level));
    },
    resumeSession: (path: string, done: () => void) => {
      spy.resumes.push(path);
      done();
    },
    panelState,
  };
}

/** The data bag the composer's chrome reads: the staged scene, plus the spies a
 *  pick, a delete, an open, an edit and a hover land on. */
function stagePanelData(
  parts: StageParts,
  actions: ReturnType<typeof stageActions>,
): ComposerPanelData {
  const {
    props,
    theme,
    size,
    mode,
    session,
    themePanel,
    panelState,
    spy,
    tree,
  } = parts;
  return {
    cwd: stageCwd(props),
    theme,
    mode,
    query: panelQuery(mode),
    commands: props.commands ?? commandSurfaces(HOST),
    session,
    themePanel,
    sessionRows: props.sessionRows ?? [],
    sessionsLoading: false,
    sessionsError: null,
    userMessages: props.userMessages ?? [],
    userMessagesLoading: false,
    userMessagesError: null,
    tree,
    panelState,
    previewFor:
      props.previewFor ??
      ((path: string) => ({ path, lines: [], note: "no preview staged" })),
    windowHeight: size?.height,
    onPick: (row, intent) => {
      spy.modes.push(mode);
      spy.picks.push({ key: row.key, label: rowLabel(row), intent });
      pickComposerRow(row, actions, intent);
    },
    onDelete: (row) => {
      spy.deletes.push(row.key);
    },
    onOpen: (row) => {
      spy.opens.push(row.key);
    },
    onEdit: (row) => {
      spy.edits.push(row.key);
    },
    onHover: (next) => {
      spy.hovers.push(next.kind === "pick" ? next.index : -1);
    },
  };
}

function ComposerStage(props: ComposerScene): JSX.Element {
  const theme = useAdwaita();
  const size = useWindowSize();
  const spy = props.spy ?? newSpy();
  const [value, setValue] = useState(props.value ?? "");
  const [mode, setMode] = useState<ComposerMode>(props.mode);
  const session = props.session ?? stubChatSession().session;

  const themePanel = useThemePanel(mode);
  const tree = useSessionTree({
    data: props.tree ?? null,
    enabled: true,
    query: panelQuery(mode),
    onNavigate: (_row: TreeRow) => undefined,
  });
  const panelState = useStagePanels(props, mode, size, setValue, spy);

  const parts: StageParts = {
    props,
    theme,
    size,
    mode,
    session,
    themePanel,
    panelState,
    spy,
    setValue,
    setMode,
    tree,
  };
  const actions = stageActions(parts);
  const data = stagePanelData(parts, actions);

  // The rows are measured once and framed from the same measurement, exactly as
  // the window does it: the cursor is placed against the list that is drawn.
  const rows = composerPanelRows(data);
  const spec = composerPanelSpec(data, rows);

  return (
    <Composer
      value={value}
      onChange={setValue}
      onSubmit={(sent) => {
        spy.sent.push(sent);
      }}
      mode={mode}
      onMode={(next) => {
        spy.modes.push(next);
        setMode(next);
      }}
      panel={spec}
      isStreaming={props.isStreaming === true}
      onAbort={() => {
        spy.aborted += 1;
      }}
      onComplete={() => {
        spy.completed += 1;
      }}
      onHistory={() => {
        spy.histories += 1;
      }}
      model={props.model ?? null}
      thinking={props.thinking ?? null}
      context={props.context ?? null}
      placeholder={props.placeholder}
    />
  );
}

/** Paint the composer with one panel open, and hand back what it drew. */
export const composerScene = async (
  scene: ComposerScene,
  options: StageOptions = {},
): Promise<Screen> => stage(<ComposerStage {...scene} />, options);

/** The words a panel prints beside its keys, read off the hint line: a word a
 *  panel does not print is a key that panel does not take. */
export const hintWords = (screen: Screen): string[] => {
  const ink = screen.inkOf("");
  const bottom = Math.max(...ink.map((entry) => entry.y));
  return ink
    .filter((entry) => Math.abs(entry.y - bottom) <= 8)
    .map((entry) => entry.text.trim());
};
