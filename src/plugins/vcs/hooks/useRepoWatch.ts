/**
 * Watching the repo for change.
 *
 * jj leaves no notifier behind, but every write moves the op log head of the
 * workspace. Polling that one path is how the changes panel notices a commit,
 * a split or an agent's describe without being asked.
 */
import { useEffect, useRef } from "react";
import { createPollWatcher, fileSample } from "adwaita-gpuix";
import { useRepoSource } from "../components/RepoSource";

export function useRepoWatch(
  cwd: string,
  enabled: boolean,
  onChanged: () => void,
): void {
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  const source = useRepoSource();
  useEffect(() => {
    if (!enabled) return;
    // The source names what to watch, and can say nothing: a story paints one
    // frozen moment and has nothing to notice moving.
    const target = source.opHeadPath(cwd);
    if (target === null) return;
    const watcher = createPollWatcher(
      () => fileSample(target),
      () => {
        onChangedRef.current();
      },
    );
    return () => watcher.stop();
  }, [cwd, enabled, source]);
}
