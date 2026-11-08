import { useEffect, useState, type JSX } from "react";
import {
  bookmarkNames,
  CandidateList,
  CandidateRow,
  DialogFrame,
  DialogHeading,
  DialogHintBar,
  groupHints,
  labeledCandidates,
  nameCandidates,
  OverlayInput,
  useCandidatePicker,
  windowCandidates,
} from "adwaita-gpuix";
import {
  BOOKMARK_PICKER_SHORTCUTS,
  PICKER_SHORTCUTS,
  hints,
  type Shortcut,
} from "../lib/shortcuts";
import { REVSETS } from "../constants";
import { listBookmarks } from "../lib/repo";

/** A picker dialog's width: one width for every picker, so a filter field and a candidate list always get the same room. */
const PICKER_WIDTH = 560;

/** How many candidates a picker shows before the window moves. */
const PICKER_ROWS = 6;

/** The keys a picker answers with, minus the ones an empty list cannot use. */
function pickerHints(shortcuts: Shortcut[], empty: boolean): Shortcut[] {
  return hints(empty ? shortcuts.filter((s) => s.id !== "forget") : shortcuts);
}

export function RevsetDialog({
  current,
  onApply,
  onCancel,
}: {
  current: string;
  onApply: (revset: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const picker = useCandidatePicker({
    shortcuts: PICKER_SHORTCUTS,
    count: () => rows.length,
    onApply: () => applyActive(),
    onCancel,
  });

  const rows = labeledCandidates(REVSETS, picker.value);
  const win = windowCandidates(rows, picker.activeIndex, PICKER_ROWS);

  const applyActive = (): void => {
    const row = rows[win.activeIdx];
    if (row !== undefined) onApply(row.revset);
    else onCancel();
  };

  return (
    <DialogFrame width={PICKER_WIDTH} dim>
      <DialogHeading icon="list" title="Revset" />
      <OverlayInput
        value={picker.value}
        placeholder="filter revsets"
        onChange={picker.onQuery}
        onSubmit={() => applyActive()}
        onKeyDown={picker.onKeyDown}
      />
      <CandidateList
        visible={win.end - win.start}
        placeholder={`No revset matches "${picker.value}"`}
      >
        {rows.slice(win.start, win.end).map((row, off) => {
          const index = win.start + off;
          const isCurrent = row.revset === current;
          return (
            <CandidateRow
              key={row.revset}
              label={row.label}
              active={index === win.activeIdx}
              icon={isCurrent ? "taskAlt" : "list"}
              iconTone={isCurrent ? "accent" : undefined}
              trailing={row.revset}
              trailingMono
              onSelect={() => onApply(row.revset)}
            />
          );
        })}
      </CandidateList>
      <DialogHintBar
        groups={groupHints(pickerHints(PICKER_SHORTCUTS, rows.length === 0))}
      />
    </DialogFrame>
  );
}

export function BookmarkDialog({
  changeId,
  onSet,
  onForget,
  onCancel,
}: {
  changeId: string;
  onSet: (name: string) => void;
  onForget: (name: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const picker = useCandidatePicker({
    shortcuts: BOOKMARK_PICKER_SHORTCUTS,
    count: () => candidates.length,
    onApply: () => applyActive(),
    onCancel,
    onForget: () => forgetActive(),
  });

  useEffect(() => {
    let cancelled = false;
    listBookmarks()
      .then((bms) => {
        if (cancelled) return;
        setNames(bookmarkNames(bms));
      })
      .catch(() => {
        if (!cancelled) setNames([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // A typed name no bookmark has is a bookmark to create, and is drawn as one
  // so it never reads as an existing bookmark.
  const candidates = nameCandidates(names, picker.value);
  const win = windowCandidates(candidates, picker.activeIndex, PICKER_ROWS);
  const activeName = candidates[win.activeIdx] ?? null;

  const applyActive = (): void => {
    if (activeName !== null) onSet(activeName);
    else onCancel();
  };

  const forgetActive = (): void => {
    // Only a name jj answered with is forgettable — never the one being typed.
    if (activeName !== null && names.includes(activeName)) onForget(activeName);
  };

  return (
    <DialogFrame width={PICKER_WIDTH} dim>
      <DialogHeading icon="bookmark" title={`Bookmark ${changeId.slice(0, 8)}`} />
      <OverlayInput
        value={picker.value}
        placeholder="bookmark name"
        onChange={picker.onQuery}
        onSubmit={() => applyActive()}
        onKeyDown={picker.onKeyDown}
      />
      <CandidateList
        visible={win.end - win.start}
        placeholder={
          loading ? "Loading bookmarks…" : "No bookmarks yet. Type to create one."
        }
      >
        {candidates.slice(win.start, win.end).map((name, off) => {
          const index = win.start + off;
          const isActive = index === win.activeIdx;
          const isCreate = !names.includes(name);
          return (
            <CandidateRow
              key={name}
              label={name}
              active={isActive}
              icon={isCreate ? "plus" : "bookmark"}
              iconTone={isCreate && !isActive ? "warning" : undefined}
              labelTone={isCreate && !isActive ? "warning" : undefined}
              trailing={isCreate ? "new bookmark" : undefined}
              onSelect={() => {
                picker.setActiveIndex(index);
                onSet(name);
              }}
            />
          );
        })}
      </CandidateList>
      <DialogHintBar
        groups={groupHints(
          pickerHints(BOOKMARK_PICKER_SHORTCUTS, candidates.length === 0),
        )}
      />
    </DialogFrame>
  );
}
