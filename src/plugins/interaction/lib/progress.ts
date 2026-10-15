import type { AskRequest } from "../types";

export function askProgressLabel(request: AskRequest): string {
  return `Question ${request.index} of ${request.total}`;
}
