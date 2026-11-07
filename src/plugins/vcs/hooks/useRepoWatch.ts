/**
 * Watching the repo for change.
 *
 * jj leaves no notifier behind, but every write moves the op log head of the
 * workspace. Polling that one path is how the changes panel notices a commit,
 * a split or an agent's describe without being asked.
 */
import { useEffect, useRef } from "react";
import { createPollWatcher, fileSample, jjOpHeadPath } from "adwaita-gpuix";
import { findWorkspaceRoot } from "../lib/repo";

export function useRepoWatch(
  cwd: string,
  enabled: boolean,
  onChanged: () => void,
): void {
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;

  useEffect(() => {
    if (!enabled) return;
    const target = jjOpHeadPath(findWorkspaceRoot(cwd));
    if (target === null) return;
    const watcher = createPollWatcher(
      () => fileSample(target),
      () => {
        onChangedRef.current();
      },
    );
    return () => watcher.stop();
  }, [cwd, enabled]);
}
