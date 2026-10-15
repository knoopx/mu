export interface AskOption {
  label: string;
  description: string;
}

export interface AskQuestion {
  id: string;
  question: string;
  context: string;
  options: AskOption[];
  allowMultiple: boolean;
}

export interface AskUserParams {
  questions: AskQuestion[];
}

export interface AskUserAnswer {
  id: string;

  selected: string[];

  custom?: string;
}

export interface AskUserDetails {
  answers: AskUserAnswer[];
  cancelled: boolean;
}

export type AskResponse =
  | {
      kind: "selection";
      selections: string[];
      comment?: string;
    }
  | {
      kind: "freeform";
      text: string;
    };

export type AskMode = "select" | "freeform" | "comment";

export type AskRow = {
  kind: "option";
  option: AskOption;
  optionIndex: number;
};

export interface AskRequest {
  runId: string;
  question: AskQuestion;

  index: number;
  total: number;
}

export interface AskSnapshot {
  request: AskRequest | null;
}

export interface AskRunResult {
  answers: AskUserAnswer[];
  cancelled: boolean;
}
