import { useEffect, useRef, useState, type JSX } from "react";
import {
  Badge,
  Row,
  ShortcutHints,
  T,
  useAdwaita,
  type AdwaitaTheme,
  type KbdColors,
} from "adwaita-gpuix";
import { matchShortcut } from "adwaita-gpuix/shortcuts";
import type { EventPayload } from "@gpuix/native";
import {
  type GpuixTheme,
  type StyleDesc,
  useWindowSize,
} from "@gpuix/react";

import {
  buildNativeTheme,
  composerFill,
  tintedBorder,
  tintedChipText,
  tintedDivider,
  tintedFill,
  tintedMuted,
  type ComposerTone,
} from "../../core/lib/ui/theme";
import {
  composerFieldBox,
  composerFieldLineStyle,
  composerFieldRow,
} from "../../core/lib/composer/field";
import {
  composerPanelHeight,
  composerPanelRowsForHeight,
} from "../../core/lib/composer/panelHeight";
import { windowRows } from "../../core/lib/composer/mode";
import { ComposerOptionRow } from "../../core/components/composer/rows";
import { addInputListener } from "../../../window/window";
import { fuzzyFilter } from "../../../fuzzy";
import { Markdown } from "../../core/components/Markdown";
import { digitOf, keyOf, modsOf } from "../../core/lib/ui/keyEvents";
import {
  createFreeformResponse,
  createSelectionResponse,
} from "../lib/normalize";
import { askHintGroups, askShortcutSet } from "../lib/shortcuts";
import {
  claimShortcut,
  runAskShortcut,
  type ShortcutSource,
} from "../lib/askShortcuts";
import type { AskMode, AskRequest, AskResponse, AskRow } from "../types";

export interface AskComposerProps {
  request: AskRequest;

  onAnswer: (response: AskResponse) => void;

  onCancel: () => void;

  initialMode?: AskMode;

  style?: Partial<StyleDesc>;
}

interface FieldFocus {
  onFocus: () => void;
  onBlur: () => void;
}

function splitRow(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "row",
    gap: t.space.md,
    flexGrow: 1,
    minHeight: 0,
    minWidth: 0,
  };
}

function listPane(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    flexGrow: 4,
    flexBasis: 0,
    minWidth: t.control.sidebarMinWidth,
    minHeight: 0,
  };
}

function detailPane(t: AdwaitaTheme): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    gap: t.space.sm,
    flexGrow: 6,
    flexBasis: 0,
    minWidth: t.control.sidebarMinWidth,
    minHeight: 0,
    paddingTop: t.space.xs,
  };
}

function dividerRule(t: AdwaitaTheme, tone: ComposerTone): StyleDesc {
  return {
    alignSelf: "stretch",
    flexShrink: 0,
    backgroundColor: tintedDivider(t, tone),
    pointerEvents: "none",
  };
}

const paneRule = (t: AdwaitaTheme, tone: ComposerTone): StyleDesc => ({
  width: t.control.dividerThickness,
  ...dividerRule(t, tone),
});

const hintRule = (t: AdwaitaTheme, tone: ComposerTone): StyleDesc => ({
  height: t.control.dividerThickness,
  ...dividerRule(t, tone),
});

const stacked = (t: AdwaitaTheme): StyleDesc => ({
  display: "flex",
  flexDirection: "column",
  gap: t.space.xs,
  flexShrink: 0,
  minWidth: 0,
});

const hintRow = (t: AdwaitaTheme): StyleDesc => ({
  ...stacked(t),
  flexDirection: "row",
  alignItems: "center",
  gap: t.space.md,
  paddingTop: t.space.xs,
});

function AskDetailPane({
  t,
  tone,
  row,
  checked,
  emptyText,
}: {
  t: AdwaitaTheme;
  tone: ComposerTone;
  row: AskRow | undefined;
  checked: boolean;
  emptyText: string;
}): JSX.Element {
  const option = row?.kind === "option" ? row : undefined;
  const title =
    option !== undefined ? option.option.label : "No matching option";
  const body =
    option !== undefined
      ? option.option.description
      : `${emptyText} — keep typing to filter the options.`;

  return (
    <div style={detailPane(t)}>
      <T
        size="caption"
        weight={600}
        color={t.color.accent.base}
        style={{ flexShrink: 0, lineHeight: t.type.caption * 1.4 }}
      >
        {title}
      </T>
      <T
        size="micro"
        color={t.color.text.primary}
        style={{ flexShrink: 0, lineHeight: t.type.micro * 1.5 }}
      >
        {body}
      </T>
      <Row style={{ flexShrink: 0 }} gap={t.space.xs}>
        {row?.kind === "option" && checked && (
          <Badge
            size="sm"
            variant="secondary"
            icon="check"
            style={{ backgroundColor: tintedFill(t, tone) }}
          >
            Selected
          </Badge>
        )}
      </Row>
      <text style={{ flexGrow: 1 }} />
    </div>
  );
}

function AskContextPane({
  t,
  theme,
  context,
}: {
  t: AdwaitaTheme;
  theme: GpuixTheme;
  context: string;
}): JSX.Element {
  return (
    <div style={stacked(t)}>
      <div style={{ flexShrink: 0, minWidth: 0 }}>
        <Markdown source={context} theme={theme} style={{ padding: 0 }} />
      </div>
    </div>
  );
}

function AskOptionsPane({
  t,
  tone,
  query,
  visible,
  start,
  activeIndex,
  activeRow,
  activeChecked,
  checked,
  allowMultiple,
  onPick,
  onHover,
}: {
  t: AdwaitaTheme;
  tone: ComposerTone;
  query: string;
  visible: AskRow[];
  start: number;
  activeIndex: number;
  activeRow: AskRow | undefined;
  activeChecked: boolean;
  checked: ReadonlySet<number>;
  allowMultiple: boolean;
  onPick: (at: number) => void;
  onHover: (at: number) => void;
}): JSX.Element {
  const emptyText = `No option matches “${query}”`;
  return (
    <div style={splitRow(t)}>
      <div style={listPane(t)}>
        {visible.length === 0 ? (
          <T
            size="caption"
            color={t.color.functional.warning}
            style={{ paddingLeft: t.space.sm }}
          >
            {emptyText}
          </T>
        ) : (
          visible.map((row, offset) => {
            const at = start + offset;
            const optionIndex = row.kind === "option" ? row.optionIndex : -1;
            return (
              <ComposerOptionRow
                key={`o-${optionIndex}`}
                label={row.kind === "option" ? row.option.label : ""}
                picked={optionIndex >= 0 && checked.has(optionIndex)}
                checkColumn={allowMultiple}
                active={at === activeIndex}
                onClick={() => {
                  onPick(at);
                }}
                onHover={() => onHover(at)}
              />
            );
          })
        )}
      </div>
      <div style={paneRule(t, tone)} />
      <AskDetailPane
        t={t}
        tone={tone}
        row={activeRow}
        checked={activeChecked}
        emptyText={emptyText}
      />
    </div>
  );
}

function AskDraftPane({
  t,
  fieldTheme,
  mode,
  freeformOnly,
  selections,
  muted,
  value,
  onDraft,
  onSubmit,
  onFieldKey,
  fieldFocus,
}: {
  t: AdwaitaTheme;
  fieldTheme: GpuixTheme;
  mode: AskMode;
  freeformOnly: boolean;
  selections: string[];
  muted: string;
  value: string;
  onDraft: (text: string) => void;
  onSubmit: () => void;
  onFieldKey: (event: EventPayload) => void;
  fieldFocus: FieldFocus;
}): JSX.Element {
  const freeform = mode === "freeform";
  return (
    <div style={stacked(t)}>
      <T size="caption" weight={600} color={t.color.accent.base}>
        {freeform ? "Custom response" : "Extra context"}
      </T>
      {mode === "comment" && selections.length > 0 && (
        <T size="caption" color={muted} style={{ flexShrink: 0 }}>
          {`Selected: ${selections.join(", ")}`}
        </T>
      )}
      <textarea
        autoFocus
        minRows={freeformOnly ? 4 : 2}
        maxRows={freeformOnly ? 8 : 6}
        theme={fieldTheme}
        value={value}
        placeholder={
          freeform
            ? "Type the answer the options do not cover"
            : "Why you chose this — sent with the selection"
        }
        onChange={(event) => onDraft(event.value ?? "")}
        onSubmit={onSubmit}
        onKeyDown={onFieldKey}
        {...fieldFocus}
        style={composerFieldBox(t)}
      />
    </div>
  );
}

function AskHintBar({
  t,
  tone,
  groups,
  chips,
  muted,
  count,
}: {
  t: AdwaitaTheme;
  tone: ComposerTone;
  groups: ReturnType<typeof askHintGroups>;
  chips: KbdColors;
  muted: string;
  count: number;
}): JSX.Element {
  return (
    <>
      <div style={hintRule(t, tone)} />
      <div style={hintRow(t)}>
        <ShortcutHints
          groups={groups}
          colors={chips}
          labelColor={muted}
          style={{ flexGrow: 1, minWidth: 0 }}
        />
        {count > 0 && (
          <T size="caption" color={muted} style={{ flexShrink: 0 }}>
            {`${count} selected`}
          </T>
        )}
      </div>
    </>
  );
}

export function AskComposer(props: AskComposerProps): JSX.Element {
  const t = useAdwaita();
  const { request, onAnswer, onCancel, initialMode } = props;
  const { question } = request;
  const allowMultiple = question.allowMultiple;
  const freeformOnly = question.options.length === 0;
  const tone: ComposerTone = "awaiting";
  const muted = tintedMuted(t, tone);
  const chips: KbdColors = {
    fill: tintedFill(t, tone),
    border: tintedBorder(t, tone),
    color: tintedChipText(t, tone),
  };

  const [cursor, setCursor] = useState(0);
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<number>>(() => new Set());
  const [mode, setMode] = useState<AskMode>(
    () => initialMode ?? (freeformOnly ? "freeform" : "select"),
  );
  const [freeformDraft, setFreeformDraft] = useState("");
  const [commentDraft, setCommentDraft] = useState("");
  const [selections, setSelections] = useState<string[]>([]);
  const fieldFocused = useRef(false);

  const fieldFocus: FieldFocus = {
    onFocus: () => {
      fieldFocused.current = true;
    },
    onBlur: () => {
      fieldFocused.current = false;
    },
  };

  useEffect(() => {
    setCursor(0);
    setQuery("");
    setChecked(new Set());
    setFreeformDraft("");
    setCommentDraft("");
    setSelections([]);
    setMode(initialMode ?? (freeformOnly ? "freeform" : "select"));
  }, [question.id, initialMode, freeformOnly]);

  const filtered =
    query.trim().length === 0
      ? question.options
      : fuzzyFilter(
          question.options,
          query.trim(),
          (option) => `${option.label} ${option.description ?? ""}`,
        );

  const rows: AskRow[] = filtered.map((option): AskRow => ({
    kind: "option",
    option,
    optionIndex: question.options.indexOf(option),
  }));

  const windowSize = useWindowSize();
  const panelBand = composerPanelHeight(windowSize?.height);
  const maxVisibleRows = composerPanelRowsForHeight(t, panelBand);

  const checkedCount = checked.size;
  const activeIndex = rows.length === 0 ? 0 : Math.min(cursor, rows.length - 1);
  const win = windowRows(rows, activeIndex, maxVisibleRows);
  const activeRow = rows[activeIndex];
  const activeOptionIndex =
    activeRow !== undefined && activeRow.kind === "option"
      ? activeRow.optionIndex
      : -1;
  const activeOptionTitles =
    activeOptionIndex >= 0 ? [question.options[activeOptionIndex]!.label] : [];
  const showList = mode === "select" && !freeformOnly;

  const move = (delta: number): void => {
    if (rows.length === 0) return;
    const count = rows.length;
    setCursor((prev) => {
      const at = Math.min(prev, count - 1);
      const next = at + delta;
      return next < 0 ? count - 1 : next >= count ? 0 : next;
    });
  };

  const jumpTo = (target: number): void => {
    if (rows.length === 0) return;
    setCursor(Math.max(0, Math.min(target, rows.length - 1)));
  };

  const titlesOf = (indices: Iterable<number>): string[] =>
    Array.from(indices)
      .sort((a, b) => a - b)
      .map((i) => question.options[i]?.label)
      .filter((title): title is string => title !== undefined);

  const submitTitles = (titles: string[]): void => {
    if (titles.length === 0) return;
    const response = createSelectionResponse(titles);
    if (response !== null) onAnswer(response);
  };

  const toggleOption = (optionIndex: number): void => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(optionIndex)) next.delete(optionIndex);
      else next.add(optionIndex);
      return next;
    });
  };

  const toggleActive = (): boolean => {
    const row = rows[activeIndex];
    if (row === undefined || row.kind !== "option") return false;
    toggleOption(row.optionIndex);
    return true;
  };

  const acceptAt = (at: number): void => {
    const row = rows[at];
    if (row === undefined || row.kind !== "option") return;
    if (allowMultiple) {
      toggleOption(row.optionIndex);
      return;
    }
    submitTitles([row.option.label]);
  };

  const checkedTitles = checkedCount > 0 ? titlesOf(checked) : [];
  const activate = (): void => {
    if (allowMultiple) {
      submitTitles(checkedTitles.length > 0 ? checkedTitles : activeOptionTitles);
      return;
    }
    acceptAt(activeIndex);
  };

  const submitChecked = (): void => submitTitles(checkedTitles);

  const submitText = (): void => {
    const response =
      mode === "freeform"
        ? createFreeformResponse(freeformDraft)
        : createSelectionResponse(selections, commentDraft);
    if (response !== null) onAnswer(response);
  };

  const toggleComment = (): void => {
    if (mode === "comment") {
      setMode("select");
      return;
    }
    const titles =
      checkedTitles.length > 0 ? checkedTitles : activeOptionTitles;
    if (titles.length === 0) return;
    setSelections(titles);
    setMode("comment");
  };

  const escape = (): void => {
    if (query.length > 0) {
      setQuery("");
      return;
    }
    onCancel();
  };

  const runShortcut = (event: EventPayload, source: ShortcutSource): boolean => {
    if (event.isHeld === true) return false;
    const mods = modsOf(event);
    const match = matchShortcut(
      askShortcutSet(mode, allowMultiple),
      keyOf(event),
      mods,
    );
    if (match === null) return false;
    if (!claimShortcut(source, match.id, mods, fieldFocused.current))
      return false;
    return runAskShortcut({
      id: match.id,
      source,
      mode,
      freeformOnly,
      rowCount: rows.length,
      move,
      jumpTo,
      activate,
      toggleActive,
      submitChecked,
      setMode,
      toggleComment,
      escape,
      cancel: onCancel,
    });
  };

  const keyRef = useRef(runShortcut);
  keyRef.current = runShortcut;

  useEffect(
    () =>
      addInputListener((event) => {
        keyRef.current(event, "window");
      }),
    [],
  );

  const onFieldKey = (event: EventPayload): void => {
    const digit = digitOf(event);
    if (digit !== null) return;
    keyRef.current(event, "field");
  };

  const fieldTheme = buildNativeTheme(t, tone);
  const contextTheme: GpuixTheme = {
    ...fieldTheme,
    text: muted,
    metrics: {
      ...fieldTheme.metrics,
      mdTextSize: t.type.micro,
      mdLineHeight: Math.round(t.type.micro * 1.5),
    },
  };
  const fieldStyle: StyleDesc = composerFieldLineStyle(t);

  const root: StyleDesc = {
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    minWidth: 0,
    maxHeight: panelBand,
    paddingLeft: t.space.lg,
    paddingRight: t.space.lg,
    paddingTop: t.space.lg,
    paddingBottom: t.space.sm,
    gap: t.space.xs,
    borderRadius: t.radius.md,
    borderWidth: 0,
    overflow: "hidden",
    backgroundColor: composerFill(t, tone),
    ...props.style,
  };

  return (
    <div style={root}>
      <T
        size="caption"
        weight={600}
        color={t.color.text.primary}
        style={{ flexShrink: 0 }}
      >
        {question.question}
      </T>

      {question.context !== "" && (
        <AskContextPane t={t} theme={contextTheme} context={question.context} />
      )}

      {showList && (
        <div style={composerFieldRow(t)}>
          <input
            autoFocus
            value={query}
            placeholder="Type to filter the options"
            theme={fieldTheme}
            onChange={(event) => setQuery(event.value ?? "")}
            onSubmit={() => activate()}
            onKeyDown={onFieldKey}
            {...fieldFocus}
            style={fieldStyle}
          />
        </div>
      )}

      {showList && (
        <AskOptionsPane
          t={t}
          tone={tone}
          query={query}
          visible={win.visible}
          start={win.start}
          activeIndex={activeIndex}
          activeRow={activeRow}
          activeChecked={
            activeOptionIndex >= 0 && checked.has(activeOptionIndex)
          }
          checked={checked}
          allowMultiple={allowMultiple}
          onPick={(at) => {
            setCursor(at);
            acceptAt(at);
          }}
          onHover={(at) => setCursor(at)}
        />
      )}

      {(mode === "freeform" || mode === "comment") && (
        <AskDraftPane
          t={t}
          fieldTheme={fieldTheme}
          mode={mode}
          freeformOnly={freeformOnly}
          selections={selections}
          muted={muted}
          value={mode === "freeform" ? freeformDraft : commentDraft}
          onDraft={(text) =>
            mode === "freeform" ? setFreeformDraft(text) : setCommentDraft(text)
          }
          onSubmit={submitText}
          onFieldKey={onFieldKey}
          fieldFocus={fieldFocus}
        />
      )}

      <AskHintBar
        t={t}
        tone={tone}
        groups={askHintGroups(mode, allowMultiple, !freeformOnly)}
        chips={chips}
        muted={muted}
        count={allowMultiple ? checkedCount : 0}
      />
    </div>
  );
}
