import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  readSync,
  unlinkSync,
} from "node:fs";
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { join } from "node:path";
import {
  AgentSessionRuntime,
  type AgentSessionRuntimeDiagnostic,
  createAgentSessionFromServices,
  createAgentSessionRuntime,
  createAgentSessionServices,
  createCodemodeExtension,
  getAgentDir,
  SessionManager,
  type ContextUsage,
  type SessionInfo,
  type AgentSession,
  type AgentSessionEventListener,
  type CreateAgentSessionRuntimeFactory,
  type PromptOptions,
  type SessionTreeNode,
} from "@earendil-works/pi-coding-agent";
import { PI_TOOL_NAMES } from "./builtInTools";
import { agentSettingsManager } from "./settings";
import { HOST } from "../../../registry";
import {
  agentExtensions,
  agentToolNames,
  agentTools,
} from "../plugin/surfaces";

export type { SessionInfo } from "@earendil-works/pi-coding-agent";
export type ThinkingLevel = AgentSession["thinkingLevel"];
export type AgentModel = NonNullable<AgentSession["model"]>;
export type AgentState = AgentSession["state"];
export type AgentAvailableModel = ReturnType<
  NonNullable<AgentSession["modelRuntime"]>["getAllModels"]
>[number];

export interface AgentOptions {
  cwd?: string;

  agentDir?: string;

  resumeSessionPath?: string;

  model?: string;
}

/**
 * The names of every tool the session may use.
 *
 * Read when a session starts, not when this module loads: the plugin host is what
 * answers the plugins' names, and a module-level read of it would run in the middle
 * of building it — the composer's data bag names the session, the session names the
 * agent, and the host is what pulls the plugins in.
 */
// pi's own tools are named once, in `builtInTools.ts`; every other name in the
// session is a plugin's, read off its manifest, so a tool can never be declared
// to the model in one file and implemented in another.
const appToolNames = (): string[] => [
  ...PI_TOOL_NAMES,
  ...agentToolNames(HOST),
];

/**
 * How a session's resources are loaded: pi's built-ins trimmed to the five tools
 * mu shows, and every plugin's extension in the order the plugins are loaded.
 *
 * Built per session rather than once at import, because the extensions are the
 * host's and the host is still being built while anything that reads it is being
 * built.
 */
const isolatedResourceLoaderOptions = () => ({
  noExtensions: true,
  disabledBuiltinExtensions: ["mcp", "codemode", "tool-search"],
  noSkills: true,
  noPromptTemplates: true,
  noThemes: true,
  extensionFactories: [...agentExtensions(HOST), createCodemodeExtension()],
});

function readDefaultModelRef(agentDir: string): string | undefined {
  try {
    const settings = JSON.parse(
      readFileSync(join(agentDir, "settings.json"), "utf8"),
    ) as {
      defaultModel?: unknown;
    };
    return typeof settings.defaultModel === "string"
      ? settings.defaultModel
      : undefined;
  } catch {
    return undefined;
  }
}

export interface AgentSnapshot {
  model: string;
  thinking: ThinkingLevel;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  contextUsed: number | null;
  contextTotal: number;
  contextPercent: number | null;
}

export interface SessionDeleteResult {
  ok: boolean;

  method: "trash" | "unlink";
  error?: string;
}

export interface AgentSessionHandle {
  bridge: AgentBridge;

  dispose: () => Promise<void>;
}

export async function createAgentSessionHandle(
  opts: AgentOptions = {},
): Promise<AgentSessionHandle> {
  const cwd = opts.cwd ?? process.cwd();
  const agentDir = opts.agentDir ?? getAgentDir();

  const initialSessionManager = opts.resumeSessionPath
    ? SessionManager.open(opts.resumeSessionPath, undefined, cwd)
    : SessionManager.create(cwd);

  const createRuntime: CreateAgentSessionRuntimeFactory = async ({
    cwd: effectiveCwd,
    agentDir: effectiveAgentDir,
    sessionManager,
    sessionStartEvent,
  }) => {
    const services = await createAgentSessionServices({
      cwd: effectiveCwd,
      agentDir: effectiveAgentDir,

      settingsManager: agentSettingsManager(effectiveCwd, effectiveAgentDir),
      resourceLoaderOptions: isolatedResourceLoaderOptions(),
    });
    const created = await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent,

      tools: appToolNames(),
      customTools: agentTools(HOST),
    });
    const diagnostics: AgentSessionRuntimeDiagnostic[] = [
      ...services.diagnostics,
    ];
    return { ...created, services, diagnostics };
  };

  const runtime = await createAgentSessionRuntime(createRuntime, {
    cwd,
    agentDir,
    sessionManager: initialSessionManager,
  });

  const bridge = new AgentBridge(runtime);

  const modelRef = opts.model ?? readDefaultModelRef(agentDir);
  if (modelRef) {
    const slash = modelRef.indexOf("/");
    const provider = slash >= 0 ? modelRef.slice(0, slash) : modelRef;
    const modelId = slash >= 0 ? modelRef.slice(slash + 1) : modelRef;
    await bridge.setModel(provider, modelId);
  }

  return {
    bridge,
    dispose: () => runtime.dispose(),
  };
}

/**
 * What a snapshot was read from.
 *
 * The status bar asks for the figures on every render, and the session answers
 * them by walking its own entries, so they are kept until one of these moves:
 * a different session, a move in its history, a different model or thinking level.
 */
interface SnapshotKey {
  session: AgentSession;
  sessionId: string;
  leafId: string | null;
  entryCount: number;
  modelRef: string;
  thinking: ThinkingLevel;
}

/** A session path that opens with a dash is an option to `trash`, not a file. */
const trashArgs = (sessionPath: string): string[] =>
  sessionPath.startsWith("-") ? ["--", sessionPath] : [sessionPath];

/** What `trash` said when it did not take the file: its own failure, then the
 *  first line of what it wrote to stderr — a reader has to be able to tell a
 *  missing `trash` from a filesystem that refused the unlink. */
function trashComplaint(trashed: SpawnSyncReturns<string>): string {
  const said: string[] = [];
  if (trashed.error) said.push(trashed.error.message);
  const stderr = trashed.stderr?.trim();
  if (stderr !== undefined && stderr !== "")
    said.push(stderr.split("\n")[0] ?? stderr);
  const hint = said.join(" \u00b7 ");
  return hint === "" ? "" : `(trash: ${hint})`;
}

const sameSnapshotKey = (a: SnapshotKey, b: SnapshotKey): boolean =>
  a.session === b.session &&
  a.sessionId === b.sessionId &&
  a.leafId === b.leafId &&
  a.entryCount === b.entryCount &&
  a.modelRef === b.modelRef &&
  a.thinking === b.thinking;

export class AgentBridge {
  private _listener: AgentSessionEventListener | undefined;
  private _unsubscribe: (() => void) | undefined;
  private _snapshot: { key: SnapshotKey; value: AgentSnapshot } | undefined;

  constructor(private readonly runtime: AgentSessionRuntime) {}

  get contextWindow(): number | undefined {
    const model = this.model as { contextWindow?: number } | undefined;
    return model?.contextWindow;
  }

  contextUsage(): ContextUsage | undefined {
    return this.session.getContextUsage();
  }

  snapshot(): AgentSnapshot {
    const key = this.snapshotKey();
    const cached = this._snapshot;
    if (cached !== undefined && sameSnapshotKey(cached.key, key))
      return cached.value;

    const session = this.session;
    const stats = session.getSessionStats();
    const usage = this.contextUsage();
    const value: AgentSnapshot = {
      model: key.modelRef,
      thinking: key.thinking,
      tokensIn: stats.tokens.input + stats.tokens.cacheRead,
      tokensOut: stats.tokens.output,
      cost: stats.cost,
      contextUsed: usage?.tokens ?? null,
      contextTotal: usage?.contextWindow ?? this.contextWindow ?? 0,
      contextPercent: usage?.percent ?? null,
    };
    this._snapshot = { key, value };
    return value;
  }

  /** Where the session stands, and what it stands with: the six figures a
   *  snapshot would go stale on, read once so the comparison has one answer. */
  private snapshotKey(): SnapshotKey {
    const manager = this.session.sessionManager;
    const model = this.model;
    return {
      session: this.session,
      sessionId: manager.getSessionId(),
      leafId: manager.getLeafId(),
      entryCount: manager.getEntryCount(),
      modelRef: model ? `${model.provider}/${model.id}` : "no-model",
      thinking: this.thinkingLevel,
    };
  }

  get session(): AgentSession {
    return this.runtime.session;
  }

  get state(): AgentState {
    return this.session.state;
  }

  get model(): AgentModel | undefined {
    return this.session.model;
  }

  get thinkingLevel(): ThinkingLevel {
    return this.session.thinkingLevel;
  }

  get availableModels(): AgentAvailableModel[] {
    return [...this.session.modelRuntime.getAllModels()];
  }

  get thinkingLevels(): ThinkingLevel[] {
    return this.session.getAvailableThinkingLevels();
  }

  get isStreaming(): boolean {
    return this.session.isStreaming;
  }

  get sessionId(): string {
    return this.session.sessionId;
  }

  get sessionFile(): string | undefined {
    return this.session.sessionFile;
  }

  async send(
    text: string,
    images?: PromptOptions["images"],
    streamingBehavior?: PromptOptions["streamingBehavior"],
  ): Promise<void> {
    await this.session.prompt(text, { images, streamingBehavior });
  }

  interrupt(): Promise<void> {
    return this.session.abort();
  }

  navigateTree(
    targetId: string,
    options?: {
      summarize?: boolean;
      customInstructions?: string;
      replaceInstructions?: boolean;
      label?: string;
    },
  ): Promise<{
    editorText?: string;
    cancelled: boolean;
    aborted?: boolean;
    summaryEntry?: unknown;
  }> {
    return this.session.navigateTree(targetId, options);
  }

  async setModel(provider: string, modelId: string): Promise<void> {
    const model = this.session.modelRuntime.getModel(provider, modelId);
    if (!model) throw new Error(`Unknown model ${provider}/${modelId}`);
    await this.session.setModel(model);
  }

  setThinkingLevel(level: ThinkingLevel): void {
    this.session.setThinkingLevel(level);
  }

  compact(customInstructions?: string): Promise<unknown> {
    return this.session.compact(customInstructions);
  }

  async newSession(): Promise<string | undefined> {
    const carried = this.model;
    const carriedThinking = this.thinkingLevel;
    const result = await this.runtime.newSession();
    if (result.cancelled) throw new Error("New session was cancelled");
    this._resubscribe();
    if (!carried) return undefined;
    const ref = `${carried.provider}/${carried.id}`;
    try {
      await this.setModel(carried.provider, carried.id);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      return `New session kept the default model: ${ref} is unavailable (${reason})`;
    }
    this.setThinkingLevel(carriedThinking);
    return undefined;
  }

  async resumeSession(sessionPath: string): Promise<void> {
    const result = await this.runtime.switchSession(sessionPath, {
      cwdOverride: this.runtime.cwd,
    });
    if (result.cancelled) throw new Error("Session resume was cancelled");
    this._resubscribe();
  }

  subscribe(listener: AgentSessionEventListener): () => void {
    this._listener = listener;
    this._resubscribe();
    return () => {
      this._unsubscribe?.();
      this._unsubscribe = undefined;
      this._listener = undefined;
    };
  }

  private _resubscribe(): void {
    this._unsubscribe?.();
    this._unsubscribe = undefined;
    if (this._listener)
      this._unsubscribe = this.session.subscribe(this._listener);
  }

  static listSessions(cwd: string): Promise<SessionInfo[]> {
    return SessionManager.list(cwd);
  }

  static deleteSession(sessionPath: string): SessionDeleteResult {
    if (!existsSync(sessionPath))
      return {
        ok: false,
        method: "trash",
        error: "Session file is already gone",
      };
    const trashed = spawnSync("trash", trashArgs(sessionPath), {
      encoding: "utf8",
    });
    if (trashed.status === 0 || !existsSync(sessionPath))
      return { ok: true, method: "trash" };
    try {
      unlinkSync(sessionPath);
      return { ok: true, method: "unlink" };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const complaint = trashComplaint(trashed);
      return {
        ok: false,
        method: "unlink",
        error: complaint === "" ? reason : `${reason} ${complaint}`,
      };
    }
  }

  static readSessionTree(sessionPath: string, cwd: string): SessionTreeNode[] {
    return SessionManager.open(sessionPath, undefined, cwd).getTree();
  }

  static readSessionMessages(sessionPath: string, cwd: string): unknown[] {
    return SessionManager.open(
      sessionPath,
      undefined,
      cwd,
    ).buildSessionContext().messages as unknown[];
  }

  static readSessionStartTs(sessionPath: string): number | undefined {
    let fd: number | undefined;
    try {
      fd = openSync(sessionPath, "r");
      const buffer = Buffer.alloc(2048);
      const read = readSync(fd, buffer, 0, 2048, 0);
      const first = buffer.subarray(0, read).toString("utf8").split("\n")[0];
      const entry = JSON.parse(first) as { timestamp?: unknown };
      const ts =
        typeof entry.timestamp === "string"
          ? Date.parse(entry.timestamp)
          : Number.NaN;
      return Number.isFinite(ts) ? ts : undefined;
    } catch {
      return undefined;
    } finally {
      if (fd !== undefined) closeSync(fd);
    }
  }
}
