import { FileCompletionProvider } from "../../../../autocomplete";
import type { ComposerPanelRow } from "../../components/composer/Composer";
import { iconForFile } from "./fileIcons";

/** How many names the file panel lists, however many the project holds. */
const FILE_ROWS_CAP = 200;

/**
 * The project's file list, walked once per folder.
 *
 * One walk answers every keystroke that narrows the panel, so the list is only
 * relisted when the tree itself goes stale — which is what a delete from the
 * panel does.
 */
const fileProviders = new Map<string, FileCompletionProvider>();

function fileProvider(cwd: string): FileCompletionProvider {
  const cached = fileProviders.get(cwd);
  if (cached !== undefined) return cached;
  const provider = new FileCompletionProvider(cwd);
  fileProviders.set(cwd, provider);
  return provider;
}

/** Drop a folder's walk, so the next read lists the tree as it now is. */
export function invalidateFileList(cwd: string): void {
  fileProviders.delete(cwd);
}

export function fileRows(
  cwd: string,
  filter: string,
  limit = FILE_ROWS_CAP,
): ComposerPanelRow[] {
  return fileProvider(cwd)
    .suggest(filter)
    .slice(0, limit)
    .map((item) => ({
      kind: "option" as const,
      key: item.value,
      label: item.value,
      icon: iconForFile(item.value),
    }));
}
