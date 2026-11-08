import {
  useEffect,
  useState,
  type Dispatch,
  type JSX,
  type SetStateAction,
} from "react";
import {
  DialogFrame,
  DialogHintBar,
  Icon,
  OverlayInput,
  T,
  candidateListHeight,
  candidateRowStyle,
  groupHints,
  useAdwaita,
  windowCandidates,
  type AdwaitaTheme,
  type IconName,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";
import {
  BOOKMARK_PICKER_SHORTCUTS,
  PICKER_SHORTCUTS,
  hints,
  matchShortcut,
  type Shortcut,
} from "../lib/shortcuts";
import { REVSETS } from "../constants";
import type { RevsetDef } from "../types";
import { bookmarkNames, listBookmarks } from "../lib/repo";
import { bareKeyArgs } from "../../core/lib/ui/keyEvents";
import { mutedText } from "../../core/lib/ui/theme";
import {
  ACTION_GLYPH,
  INLINE_GLYPH,
  ROW_HEIGHT,
  emphasisWeight,
  plainWeight,
  titleWeight,
} from "../../core/lib/ui/tokens";

/** A picker dialog's width: one width for every picker, so a filter field and a candidate list always get the same room. */
const PICKER_WIDTH = 560;

/** How many candidates a picker shows before it scrolls. */
const PICKER_ROWS = 6;

function DialogHeading({
  icon,
  title,
}: {
  icon: IconName;
  title: string;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: t.space.sm,
      }}
    >
      <Icon name={icon} size={ACTION_GLYPH} color={t.color.accent.base} />
      <T
        size="title2"
        weight={titleWeight(t)}
        color={t.color.text.primary}
      >
        {title}
      </T>
    </div>
  );
}

function usePicker(): {
  value: string;
  active: number;
  setActive: Dispatch<SetStateAction<number>>;
  onQuery: (next: string) => void;
} {
  const [value, setValue] = useState("");
  const [active, setActive] = useState(0);
  return {
    value,
    active,
    setActive,
    onQuery: (next: string) => {
      setValue(next);
      setActive(0);
    },
  };
}

function pickerKeys(opts: {
  shortcuts: Shortcut[];
  count: number;
  setActive: Dispatch<SetStateAction<number>>;
  onApply: () => void;
  onCancel: () => void;
  onForget?: () => void;
}): (event: { key?: string }) => void {
  return (event: { key?: string }): void => {
    const { key, mods } = bareKeyArgs(event);
    const m = matchShortcut(opts.shortcuts, key, mods);
    if (m === null) return;
    if (m.id === "nav-up") opts.setActive((i) => Math.max(0, i - 1));
    if (m.id === "nav-down")
      opts.setActive((i) => Math.min(i + 1, Math.max(opts.count - 1, 0)));
    if (m.id === "apply") opts.onApply();
    if (m.id === "cancel") opts.onCancel();
    if (m.id === "forget") opts.onForget?.();
  };
}

/** The keys a picker answers with, minus the ones an empty list cannot use. */
function pickerHints(shortcuts: Shortcut[], empty: boolean): Shortcut[] {
  return hints(empty ? shortcuts.filter((s) => s.id !== "forget") : shortcuts);
}

function candidateListStyle(t: AdwaitaTheme, visible: number): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: t.space.xs,
    height: candidateListHeight(visible, ROW_HEIGHT),
  };
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
  const t = useAdwaita();
  const { value, active, setActive, onQuery } = usePicker();

  const query = value.trim().toLowerCase();
  const rows = REVSETS.filter(
    (r: RevsetDef) =>
      query.length === 0 ||
      r.label.toLowerCase().includes(query) ||
      r.revset.toLowerCase().includes(query),
  );
  const win = windowCandidates(rows, active, PICKER_ROWS);

  const applyActive = (): void => {
    const row = rows[win.activeIdx];
    if (row !== undefined) onApply(row.revset);
    else onCancel();
  };

  return (
    <DialogFrame width={PICKER_WIDTH} dim>
      <DialogHeading icon="list" title="Revset" />
      <OverlayInput
        value={value}
        placeholder="filter revsets"
        onChange={onQuery}
        onSubmit={applyActive}
        onKeyDown={pickerKeys({
          shortcuts: PICKER_SHORTCUTS,
          count: rows.length,
          setActive,
          onApply: applyActive,
          onCancel,
        })}
      />
      <div style={candidateListStyle(t, win.end - win.start)}>
        {rows.length === 0 ? (
          <T size="body" color={mutedText(t)}>
            {`No revset matches "${value}"`}
          </T>
        ) : (
          rows.slice(win.start, win.end).map((row, off) => {
            const index = win.start + off;
            const isActive = index === win.activeIdx;
            const isCurrent = row.revset === current;
            return (
              <div
                key={row.revset}
                onClick={() => onApply(row.revset)}
                style={candidateRowStyle(t, isActive)}
              >
                <Icon
                  name={isCurrent ? "taskAlt" : "list"}
                  size={INLINE_GLYPH}
                  color={
                    isCurrent || isActive
                      ? t.color.accent.base
                      : mutedText(t)
                  }
                />
                <T
                  size="body"
                  weight={isActive ? emphasisWeight(t) : plainWeight(t)}
                  color={isActive ? t.color.accent.base : t.color.text.primary}
                  style={{ minWidth: 0, whiteSpace: "nowrap" }}
                >
                  {row.label}
                </T>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    flexGrow: 1,
                    minWidth: 0,
                  }}
                >
                  <T
                    size="caption"
                    color={mutedText(t)}
                    style={{ whiteSpace: "nowrap" }}
                  >
                    {row.revset}
                  </T>
                </div>
              </div>
            );
          })
        )}
      </div>
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
  const t = useAdwaita();
  const { value, active, setActive, onQuery } = usePicker();
  const [names, setNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

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

  const query = value.trim().toLowerCase();
  const filtered =
    query.length === 0
      ? names
      : names.filter((n) => n.toLowerCase().includes(query));
  // A typed name no bookmark has is a bookmark to create, and is drawn as one
  // so it never reads as an existing bookmark.
  const candidates =
    query.length > 0 && !names.some((n) => n.toLowerCase() === query)
      ? [...filtered, value.trim()]
      : filtered;
  const win = windowCandidates(candidates, active, PICKER_ROWS);
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
      <DialogHeading
        icon="bookmark"
        title={`Bookmark ${changeId.slice(0, 8)}`}
      />
      <OverlayInput
        value={value}
        placeholder="bookmark name"
        onChange={onQuery}
        onSubmit={applyActive}
        onKeyDown={pickerKeys({
          shortcuts: BOOKMARK_PICKER_SHORTCUTS,
          count: candidates.length,
          setActive,
          onApply: applyActive,
          onCancel,
          onForget: forgetActive,
        })}
      />
      <div style={candidateListStyle(t, win.end - win.start)}>
        {loading ? (
          <T size="body" color={mutedText(t)}>
            Loading bookmarks…
          </T>
        ) : candidates.length === 0 ? (
          <T size="body" color={mutedText(t)}>
            No bookmarks yet. Type to create one.
          </T>
        ) : (
          candidates.slice(win.start, win.end).map((name, off) => {
            const index = win.start + off;
            const isActive = index === win.activeIdx;
            const isCreate = !names.includes(name);
            const rowColor = isActive
              ? t.color.accent.base
              : isCreate
                ? t.color.functional.warning
                : null;
            return (
              <div
                key={name}
                onClick={() => {
                  setActive(index);
                  onSet(name);
                }}
                style={candidateRowStyle(t, isActive)}
              >
                <Icon
                  name={isCreate ? "plus" : "bookmark"}
                  size={INLINE_GLYPH}
                  color={rowColor ?? mutedText(t)}
                />
                <T
                  size="body"
                  weight={isActive ? emphasisWeight(t) : plainWeight(t)}
                  color={rowColor ?? t.color.text.primary}
                >
                  {name}
                </T>
                {isCreate ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      flexGrow: 1,
                      minWidth: 0,
                    }}
                  >
                    <T
                      size="caption"
                      color={mutedText(t)}
                      style={{ whiteSpace: "nowrap" }}
                    >
                      new bookmark
                    </T>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
      <DialogHintBar
        groups={groupHints(
          pickerHints(BOOKMARK_PICKER_SHORTCUTS, candidates.length === 0),
        )}
      />
    </DialogFrame>
  );
}
