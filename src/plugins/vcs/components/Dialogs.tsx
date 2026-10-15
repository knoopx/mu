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
  Textarea,
  candidateListHeight,
  candidateRowStyle,
  groupHints,
  useAdwaita,
  windowCandidates,
  type IconName,
} from "adwaita-gpuix";
import type { EventPayload } from "@gpuix/native";
import type { StyleDesc } from "@gpuix/react";
import {
  DESCRIBE_SHORTCUTS,
  PICKER_SHORTCUTS,
  hints,
  matchShortcut,
} from "../lib/shortcuts";
import { REVSETS } from "../constants";
import type { RevsetDef } from "../types";
import { listBookmarks } from "../lib/repo";
import { bareKeyArgs, keyArgsOf } from "../../core/lib/ui/keyEvents";

const ROW_H = 24;
const MAX_ROWS = 6;

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
      <Icon name={icon} size={18} color={t.color.accent.base} />
      <T size="title2" weight={700} color={t.color.text.primary}>
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
  count: number;
  setActive: Dispatch<SetStateAction<number>>;
  onApply: () => void;
  onCancel: () => void;
}): (event: { key?: string }) => void {
  return (event: { key?: string }): void => {
    const { key, mods } = bareKeyArgs(event);
    const m = matchShortcut(PICKER_SHORTCUTS, key, mods);
    if (m === null) return;
    if (m.id === "nav-up") opts.setActive((i) => Math.max(0, i - 1));
    if (m.id === "nav-down")
      opts.setActive((i) => Math.min(i + 1, Math.max(opts.count - 1, 0)));
    if (m.id === "apply") opts.onApply();
    if (m.id === "cancel") opts.onCancel();
  };
}

function candidateListStyle(visible: number): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    height: candidateListHeight(visible, ROW_H),
  };
}

export function DescribeDialog({
  targets,
  onSubmit,
  onCancel,
}: {
  targets: string[];
  onSubmit: (message: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const t = useAdwaita();
  const [value, setValue] = useState("");
  const label = `Describe (${targets.length} change${targets.length === 1 ? "" : "s"})`;

  const submit = (): void => {
    const message = value.trim();
    if (message.length === 0) onCancel();
    else onSubmit(message);
  };

  return (
    <DialogFrame width={520} dim>
      <DialogHeading icon="article" title={label} />
      <Textarea
        autoFocus
        value={value}
        placeholder="change description"
        rows={3}
        onChange={(next: string) => setValue(next)}
        style={{ flexGrow: 1 }}
        onKeyDown={(event: EventPayload) => {
          const { key, mods } = keyArgsOf(event);
          const m = matchShortcut(DESCRIBE_SHORTCUTS, key, mods);
          if (m === null) return;
          if (m.id === "describe") submit();
          if (m.id === "cancel") onCancel();
        }}
      />
      <DialogHintBar groups={groupHints(hints(DESCRIBE_SHORTCUTS))} />
    </DialogFrame>
  );
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
  const win = windowCandidates(rows, active, MAX_ROWS);

  const applyActive = (): void => {
    const row = rows[win.activeIdx];
    if (row !== undefined) onApply(row.revset);
    else onCancel();
  };

  return (
    <DialogFrame width={560} dim>
      <DialogHeading icon="list" title="Revset" />
      <OverlayInput
        value={value}
        placeholder="filter revsets"
        onChange={onQuery}
        onSubmit={applyActive}
        onKeyDown={pickerKeys({
          count: rows.length,
          setActive,
          onApply: applyActive,
          onCancel,
        })}
      />
      <div style={candidateListStyle(win.end - win.start)}>
        {rows.length === 0 ? (
          <T size="body" color={t.color.text.dim}>
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
                  size={14}
                  color={
                    isCurrent || isActive
                      ? t.color.accent.base
                      : t.color.text.dim
                  }
                />
                <T
                  size="body"
                  weight={isActive ? 600 : 400}
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
                    color={t.color.text.dim}
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
      <DialogHintBar groups={groupHints(hints(PICKER_SHORTCUTS))} />
    </DialogFrame>
  );
}

export function BookmarkDialog({
  changeId,
  onSet,
  onCancel,
}: {
  changeId: string;
  onSet: (name: string) => void;
  onCancel: () => void;
}): JSX.Element {
  const t = useAdwaita();
  const { value, active, setActive, onQuery } = usePicker();
  const [names, setNames] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    listBookmarks()
      .then((bms) => {
        if (cancelled) return;
        setNames(Array.from(new Set(bms.map((b) => b.name).sort())));
      })
      .catch(() => {
        if (!cancelled) setNames([]);
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
  const candidates =
    query.length > 0 && !names.some((n) => n.toLowerCase() === query)
      ? [...filtered, value.trim()]
      : filtered;
  const win = windowCandidates(candidates, active, MAX_ROWS);
  const activeName = candidates[win.activeIdx] ?? null;

  const applyActive = (): void => {
    if (activeName !== null) onSet(activeName);
    else onCancel();
  };

  return (
    <DialogFrame width={520} dim>
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
          count: candidates.length,
          setActive,
          onApply: applyActive,
          onCancel,
        })}
      />
      <div style={candidateListStyle(win.end - win.start)}>
        {candidates.slice(win.start, win.end).map((name, off) => {
          const index = win.start + off;
          const isActive = index === win.activeIdx;
          return (
            <div
              key={name}
              onClick={() => onSet(name)}
              style={candidateRowStyle(t, isActive)}
            >
              <Icon
                name="bookmark"
                size={14}
                color={isActive ? t.color.accent.base : t.color.text.dim}
              />
              <T
                size="body"
                weight={isActive ? 600 : 400}
                color={isActive ? t.color.accent.base : t.color.text.primary}
              >
                {name}
              </T>
            </div>
          );
        })}
      </div>
      <DialogHintBar groups={groupHints(hints(PICKER_SHORTCUTS))} />
    </DialogFrame>
  );
}
