import {
  closeSync,
  existsSync,
  openSync,
  readFileSync,
  readSync,
  unlinkSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
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
  type ToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { agentSettingsManager } from "./settings";
import { askUserTool } from "../../../interaction/tools/askUser";
import { CODE_QUALITY_TOOL_NAMES } from "../../../code-quality/constants";
import { codeComplexityTool } from "../../../code-quality/tools/codeComplexity";
import { codeDeadCodeTool } from "../../../code-quality/tools/codeDeadCode";
import { codeDuplicatesTool } from "../../../code-quality/tools/codeDuplicates";
import { codeReviewTool } from "../../../code-quality/tools/codeReview";
import { codeSymbolInspectTool } from "../../../code-quality/tools/codeSymbolInspect";
import { codeSymbolReferencesTool } from "../../../code-quality/tools/codeSymbolReferences";
import { webSearchTool } from "../../../web-search/tools/webSearch";
import { GITHUB_TOOL_NAMES } from "../../../github/constants";
import { githubCommitTool } from "../../../github/tools/githubCommit";
import { githubFileTool } from "../../../github/tools/githubFile";
import { githubIssueTool } from "../../../github/tools/githubIssue";
import { githubPrTool } from "../../../github/tools/githubPr";
import { githubReleaseTool } from "../../../github/tools/githubRelease";
import { githubRepoTool } from "../../../github/tools/githubRepo";
import { githubSearchTool } from "../../../github/tools/githubSearch";
import { githubTreeTool } from "../../../github/tools/githubTree";
import { githubUserTool } from "../../../github/tools/githubUser";
import { OPENUI_TOOL_NAMES } from "../../../openui/constants";
import { openUIPromptTool } from "../../../openui/tools/openuiPrompt";
import { openUILibraryTool } from "../../../openui/tools/openuiLibrary";
import { openUIValidateTool } from "../../../openui/tools/openuiValidate";
import { openUIRenderTool } from "../../../openui/tools/openuiRender";
import { openUIStreamTool } from "../../../openui/tools/openuiStream";
import { openUIStateTool } from "../../../openui/tools/openuiState";
import { openUIEventsTool } from "../../../openui/tools/openuiEvents";
import { openUIToolsTool } from "../../../openui/tools/openuiTools";
import { openUIListTool } from "../../../openui/tools/openuiList";
import { openUISwitchTool } from "../../../openui/tools/openuiSwitch";
import { openUIClearTool } from "../../../openui/tools/openuiClear";
import { guardrailsExtension } from "../../../guardrails/lib/guardrailsExtension";
import { snapcompactExtension } from "../../../snapcompact/lib/extension";
import { guardrailsCoverageTool } from "../../../guardrails/tools/guardrailsCoverage";
import { guardrailsFixtureUpdateTool } from "../../../guardrails/tools/guardrailsFixtureUpdate";
import { guardrailsTestTool } from "../../../guardrails/tools/guardrailsTest";
import { VCS_TOOL_NAMES } from "../../../vcs/constants";
import { vcsConflictsTool } from "../../../vcs/tools/vcsConflicts";
import { vcsDescribeTool } from "../../../vcs/tools/vcsDescribe";
import { vcsFileDiffTool } from "../../../vcs/tools/vcsFileDiff";
import { vcsFileHistoryShowTool } from "../../../vcs/tools/vcsFileHistoryShow";
import { vcsFileHistoryTool } from "../../../vcs/tools/vcsFileHistory";
import { vcsFileSplitTool } from "../../../vcs/tools/vcsFileSplit";
import { vcsHunkListTool } from "../../../vcs/tools/vcsHunkList";
import { vcsHunkSplitTool } from "../../../vcs/tools/vcsHunkSplit";
import { vcsLogTool } from "../../../vcs/tools/vcsLog";
import { vcsOplogTool } from "../../../vcs/tools/vcsOplog";
import { MERMAID_TOOL_NAMES } from "../../../mermaid/constants";
import { mermaidRenderTool } from "../../../mermaid/tools/mermaidRender";
import { FIGURE_TOOL_NAMES } from "../../../figures/constants";
import { chartRenderTool } from "../../../figures/tools/chartRender";
import { treeRenderTool } from "../../../figures/tools/treeRender";
import { tableRenderTool } from "../../../figures/tools/tableRender";
import { PLANNING_TOOL_NAMES } from "../../../planning/constants";
import { planTool } from "../../../planning/tools/plan";

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

const APP_TOOL_NAMES = [
  "read",
  "bash",
  "edit",
  "write",
  "codemode",
  "ask-user",
  "search-duckduckgo",
  ...GITHUB_TOOL_NAMES,
  "guardrails-test",
  "guardrails-fixture-update",
  "guardrails-coverage",
  ...VCS_TOOL_NAMES,
  ...CODE_QUALITY_TOOL_NAMES,
  ...OPENUI_TOOL_NAMES,
  ...MERMAID_TOOL_NAMES,
  ...FIGURE_TOOL_NAMES,
  ...PLANNING_TOOL_NAMES,
];

const ISOLATED_RESOURCE_LOADER_OPTIONS = {
  noExtensions: true,
  disabledBuiltinExtensions: ["mcp", "codemode", "tool-search"],
  noSkills: true,
  noPromptTemplates: true,
  noThemes: true,
  extensionFactories: [
    guardrailsExtension,
    snapcompactExtension,
    createCodemodeExtension(),
  ],
};

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
      resourceLoaderOptions: ISOLATED_RESOURCE_LOADER_OPTIONS,
    });
    const created = await createAgentSessionFromServices({
      services,
      sessionManager,
      sessionStartEvent,

      tools: [...APP_TOOL_NAMES],
      customTools: [
        askUserTool,
        webSearchTool,
        githubRepoTool,
        githubFileTool,
        githubTreeTool,
        githubPrTool,
        githubIssueTool,
        githubReleaseTool,
        githubCommitTool,
        githubSearchTool,
        githubUserTool,
        guardrailsTestTool,
        guardrailsFixtureUpdateTool,
        guardrailsCoverageTool,
        vcsLogTool,
        vcsFileDiffTool,
        vcsFileHistoryTool,
        vcsFileHistoryShowTool,
        vcsConflictsTool,
        vcsOplogTool,
        vcsDescribeTool,
        vcsFileSplitTool,
        vcsHunkListTool,
        vcsHunkSplitTool,
        codeComplexityTool,
        codeDeadCodeTool,
        codeDuplicatesTool,
        codeReviewTool,
        codeSymbolInspectTool,
        codeSymbolReferencesTool,
        openUIPromptTool,
        openUILibraryTool,
        openUIValidateTool,
        openUIRenderTool,
        openUIStreamTool,
        openUIStateTool,
        openUIEventsTool,
        openUIToolsTool,
        openUIListTool,
        openUISwitchTool,
        openUIClearTool,
        mermaidRenderTool,
        chartRenderTool,
        treeRenderTool,
        tableRenderTool,
        planTool,
      ] as ToolDefinition[],
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

export class AgentBridge {
  private _listener: AgentSessionEventListener | undefined;
  private _unsubscribe: (() => void) | undefined;
  private _snapshot:
    | {
        session: AgentSession;
        sessionId: string;
        leafId: string | null;
        entryCount: number;
        modelRef: string;
        thinking: ThinkingLevel;
        value: AgentSnapshot;
      }
    | undefined;

  constructor(private readonly runtime: AgentSessionRuntime) {}

  get contextWindow(): number | undefined {
    const model = this.model as { contextWindow?: number } | undefined;
    return model?.contextWindow;
  }

  contextUsage(): ContextUsage | undefined {
    return this.session.getContextUsage();
  }

  snapshot(): AgentSnapshot {
    const session = this.session;
    const manager = session.sessionManager;
    const sessionId = manager.getSessionId();
    const leafId = manager.getLeafId();
    const entryCount = manager.getEntryCount();
    const model = this.model;
    const modelRef = model ? `${model.provider}/${model.id}` : "no-model";
    const thinking = this.thinkingLevel;
    const cached = this._snapshot;
    if (
      cached !== undefined &&
      cached.session === session &&
      cached.sessionId === sessionId &&
      cached.leafId === leafId &&
      cached.entryCount === entryCount &&
      cached.modelRef === modelRef &&
      cached.thinking === thinking
    )
      return cached.value;

    const stats = session.getSessionStats();
    const usage = this.contextUsage();
    const value: AgentSnapshot = {
      model: modelRef,
      thinking,
      tokensIn: stats.tokens.input + stats.tokens.cacheRead,
      tokensOut: stats.tokens.output,
      cost: stats.cost,
      contextUsed: usage?.tokens ?? null,
      contextTotal: usage?.contextWindow ?? this.contextWindow ?? 0,
      contextPercent: usage?.percent ?? null,
    };
    this._snapshot = {
      session,
      sessionId,
      leafId,
      entryCount,
      modelRef,
      thinking,
      value,
    };
    return value;
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
    const args = sessionPath.startsWith("-")
      ? ["--", sessionPath]
      : [sessionPath];
    const trashed = spawnSync("trash", args, { encoding: "utf8" });
    if (trashed.status === 0 || !existsSync(sessionPath))
      return { ok: true, method: "trash" };
    try {
      unlinkSync(sessionPath);
      return { ok: true, method: "unlink" };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      const hints: string[] = [];
      if (trashed.error) hints.push(trashed.error.message);
      const stderr = trashed.stderr?.trim();
      if (stderr !== undefined && stderr !== "")
        hints.push(stderr.split("\n")[0] ?? stderr);
      const hint = hints.join(" \u00b7 ");
      return {
        ok: false,
        method: "unlink",
        error: hint === "" ? reason : `${reason} (trash: ${hint})`,
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
