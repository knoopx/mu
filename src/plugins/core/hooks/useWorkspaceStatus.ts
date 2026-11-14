import { useEffect, useState } from "react";
import { useProjectSource } from "../components/ProjectSource";
import {
  shortenPath,
  type WorkspaceStatus,
} from "../lib/workspace/workspaceStatus";

export function useWorkspaceStatus(cwd: string): WorkspaceStatus {
  const data = useProjectSource();
  const [workspace, setWorkspace] = useState<WorkspaceStatus>(() => ({
    projectPath: shortenPath(cwd),
    bookmark: null,
  }));
  useEffect(() => {
    setWorkspace(data.workspace(cwd));
  }, [cwd, data]);
  return workspace;
}
