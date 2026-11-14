import { progressText, toAnswer } from "./normalize";
import type {
  AskResponse,
  AskRunResult,
  AskSnapshot,
  AskUserAnswer,
  AskUserDetails,
  AskQuestion,
} from "../types";

export type AskListener = () => void;

export type AskProgress = (text: string, details: AskUserDetails) => void;

interface AskRun {
  id: string;
  questions: AskQuestion[];
  index: number;
  answers: AskUserAnswer[];
  settled: boolean;
  resolve: (result: AskRunResult) => void;
  onProgress: AskProgress | undefined;
}

const EMPTY_SNAPSHOT: AskSnapshot = { request: null };

let runSeq = 0;

class AskStore {
  private runs: AskRun[] = [];
  private listeners = new Set<AskListener>();
  private snapshot: AskSnapshot = EMPTY_SNAPSHOT;
  private uiMounts = 0;

  get hasUi(): boolean {
    return this.uiMounts > 0;
  }

  mountUi(): () => void {
    this.uiMounts += 1;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.uiMounts = Math.max(0, this.uiMounts - 1);
    };
  }

  subscribe = (listener: AskListener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): AskSnapshot => this.snapshot;

  run(
    questions: AskQuestion[],
    signal: AbortSignal | undefined,
    onProgress?: AskProgress,
  ): Promise<AskRunResult> {
    return new Promise<AskRunResult>((resolve) => {
      const run: AskRun = {
        id: `ask-${++runSeq}`,
        questions,
        index: 0,
        answers: [],
        settled: false,
        resolve,
        onProgress,
      };
      this.runs.push(run);
      if (signal) {
        if (signal.aborted) this.finish(run, true);
        else
          signal.addEventListener("abort", () => this.finish(run, true), {
            once: true,
          });
      }
      this.publish();
      this.report(run);
    });
  }

  answer(response: AskResponse): void {
    const run = this.runs[0];
    if (run === undefined || run.settled) return;

    run.answers.push(toAnswer(run.questions[run.index], response));
    run.index += 1;

    if (run.index >= run.questions.length) {
      this.finish(run, false);
      return;
    }
    this.publish();
    this.report(run);
  }

  cancel(): void {
    const run = this.runs[0];
    if (run === undefined) return;
    this.finish(run, true);
  }

  private finish(run: AskRun, cancelled: boolean): void {
    if (run.settled) return;
    run.settled = true;
    const at = this.runs.indexOf(run);
    if (at >= 0) this.runs.splice(at, 1);
    this.publish();
    run.resolve({ answers: run.answers, cancelled });
  }

  private report(run: AskRun): void {
    run.onProgress?.(progressText(run.index, run.questions.length), {
      answers: run.answers,
      cancelled: false,
    });
  }

  private publish(): void {
    const run = this.runs[0];
    const question = run?.questions[run.index];
    const next: AskSnapshot =
      run === undefined || question === undefined || run.settled
        ? EMPTY_SNAPSHOT
        : {
            request: {
              runId: run.id,
              question,
              index: run.index + 1,
              total: run.questions.length,
            },
          };
    const previous = this.snapshot;
    const same =
      previous === next ||
      (previous.request === null && next.request === null) ||
      (previous.request !== null &&
        next.request !== null &&
        previous.request.runId === next.request.runId &&
        previous.request.index === next.request.index &&
        previous.request.question.id === next.request.question.id);
    if (same) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}

export const askStore = new AskStore();
