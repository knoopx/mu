import type { IconName } from "adwaita-gpuix";

export interface Option {
  value: string;
  label: string;
  icon?: IconName;
}

// A lang prop accepts a plain string or a { value, label, icon } record for
// every choice-carrying component; normalize it once here.
export function optionList(list: unknown[]): Option[] {
  return (list ?? []).map((entry) =>
    typeof entry === "string"
      ? { value: entry, label: entry }
      : {
          value: String((entry as { value?: string }).value ?? ""),
          label: String(
            (entry as { label?: string }).label ??
              (entry as { value?: string }).value ??
              "",
          ),
          icon: (entry as { icon?: string }).icon as IconName | undefined,
        },
  );
}

// An adwaita cell — the view switcher's segment, a tab. `icon` is required only
// where adwaita asks for one, so it stays a type parameter: a cell built with a
// fallback icon always carries one, a cell built without may not.
export interface ChoiceCell<I = IconName | undefined> {
  id: string;
  label: string;
  icon: I;
}

// The header bar's view switcher and the tab strip are the same component in
// adwaita's words: a choice list becomes cells keyed by id. A ViewSwitcher
// wants an icon on every cell and passes a fallback; Tabs leave a bare cell.
export function choiceCells(items: unknown[]): ChoiceCell<IconName | undefined>[];
export function choiceCells(
  items: unknown[],
  fallbackIcon: IconName,
): ChoiceCell<IconName>[];
export function choiceCells(
  items: unknown[],
  fallbackIcon?: IconName,
): ChoiceCell<IconName | undefined>[] {
  return optionList(items).map((entry) => ({
    id: entry.value,
    label: entry.label,
    icon: entry.icon ?? fallbackIcon,
  }));
}

// The bound field may not name a cell yet — an unwritten $var, or a value some
// other control wrote. Show the first cell rather than an empty strip.
export function pickedId(cells: readonly { id: string }[], value: unknown): string {
  return cells.some((cell) => cell.id === value)
    ? String(value)
    : (cells[0]?.id ?? "");
}
