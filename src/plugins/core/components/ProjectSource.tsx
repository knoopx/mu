import { readFileSync } from "node:fs";
import { createContext, useContext, type ReactNode } from "react";
import {
  loadProjectSummary,
  type ProjectSummaryModel,
} from "../lib/project/projectSummary";
import {
  readWorkspaceStatus,
  type WorkspaceStatus,
} from "../lib/workspace/workspaceStatus";

export interface ProjectSource {
  workspace(cwd: string): WorkspaceStatus;

  projectSummary(cwd: string): Promise<ProjectSummaryModel>;

  readFile(path: string): string | null;
}

const LIVE_PROJECT: ProjectSource = {
  workspace: (cwd) => readWorkspaceStatus(cwd),
  projectSummary: (cwd) => loadProjectSummary({ cwd }),
  readFile: (path) => readText(path),
};

function readText(path: string): string | null {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return null;
  }
}

const ProjectSourceContext = createContext<ProjectSource>(LIVE_PROJECT);

export function ProjectSourceProvider(props: {
  source: ProjectSource;
  children: ReactNode;
}) {
  return (
    <ProjectSourceContext.Provider value={props.source}>
      {props.children}
    </ProjectSourceContext.Provider>
  );
}

export const useProjectSource = (): ProjectSource =>
  useContext(ProjectSourceContext);
