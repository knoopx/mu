import { useEffect, useRef, type JSX } from "react";
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
  type PublicInstance,
  type StyleDesc,
  useGpuixRequired,
  useWindowSize,
} from "@gpuix/react";

import {
  buildNativeTheme,
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
  paneInk,
  panelBox,
  panelChrome,
  panelGap,
  panelInset,
  paneGap,
  ruleH,
  ruleV,
} from "../../core/lib/composer/chrome";
import { ownsFocus } from "../../core/lib/composer/keyRouter";
import {
  composerPanelHeight,
  composerPanelRowsForHeight,
} from "../../core/lib/composer/panelHeight";
import { ComposerOptionRow } from "../../core/components/composer/rows";
import { addInputListener } from "../../../window/window";
import { viewerHoldsKeys } from "../../core/lib/ui/imageViewer";
import { Markdown } from "../../core/components/Markdown";
import { emphasisWeight, lineBox } from "../../core/lib/ui/tokens";
import { digitOf, keyOf, modsOf } from "../../core/lib/ui/keyEvents";
import { useAskAnswer } from "../hooks/useAskAnswer";
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

/**
 * The panel's field and the window listener each get their own copy of one key
 * press, so exactly one of them may act on it. The renderer's focused element is
 * the only answer both paths can agree on: a focus listener of our own misses the
 * focus `autoFocus` takes, so the press gets claimed twice — a cursor that jumps
 * two rows for one arrow key.
 */
type FieldCapture = (node: PublicInstance | null) => void;

/** How the question's two panes share the width: the options first, the detail wider. */
const PANE_GROW = { list: 4, detail: 6 } as const;

/** How tall the free-form field may stand, in rows — taller when it is the only thing asked. */
const FREEFORM_FIELD = { min: 4, max: 8 } as const;
const OPTION_FIELD = { min: 2, max: 6 } as const;

/**
 * The question panel is framed by the composer's chrome — the same box, the same
 * ink column, the same rules — and adds only what is its own: two panes that
 * share the width, the options first and the detail beside them wider.
 */
const splitRow = (t: AdwaitaTheme): StyleDesc => panelChrome(t).splitRow;

const listPane = (t: AdwaitaTheme): StyleDesc =>
  panelChrome(t).flexPane(PANE_GROW.list);

const detailPane = (t: AdwaitaTheme): StyleDesc => ({
  ...panelChrome(t).flexPane(PANE_GROW.detail),
  ...paneInk(t),
  gap: panelGap(t),
  paddingTop: panelGap(t),
});

/** The question panel's rules carry its tone, which is the one thing chrome cannot know. */
const paneRule = (t: AdwaitaTheme, tone: ComposerTone): StyleDesc =>
  ruleV(t, tintedDivider(t, tone));

const hintRule = (t: AdwaitaTheme, tone: ComposerTone): StyleDesc =>
  ruleH(t, tintedDivider(t, tone));

const stacked = (t: AdwaitaTheme): StyleDesc => ({
  ...panelChrome(t).column,
  gap: panelGap(t),
  flexShrink: 0,
  minWidth: 0,
});

/** A pane's worth of prose, standing in the same ink column as the rows beside it. */
const inkStack = (t: AdwaitaTheme): StyleDesc => ({
  ...stacked(t),
  ...paneInk(t),
});

const hintRow = (t: AdwaitaTheme): StyleDesc => ({
  ...stacked(t),
  ...paneInk(t),
  flexDirection: "row",
  alignItems: "center",
  gap: paneGap(t),
  paddingTop: panelGap(t),
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
  // The list one pane to the left already prints the highlighted option's label,
  // so a pane titled with that same label says it twice, side by side. Its job is
  // the half the list has no room for: what the choice costs. A title only stands
  // when there is no option under the cursor at all.
  const title = option !== undefined ? "" : "No matching option";
  const body =
    option !== undefined
      ? (option.option.description ?? "")
      : `${emptyText} — keep typing to filter the options.`;

  return (
    <div style={detailPane(t)}>
      {title === "" ? null : (
        <T
          size="caption"
          weight={emphasisWeight(t)}
          color={t.color.accent.base}
          style={{ flexShrink: 0, lineHeight: lineBox(t, "caption") }}
        >
          {title}
        </T>
      )}
      <T
        size="micro"
        color={t.color.text.primary}
        style={{ flexShrink: 0, lineHeight: lineBox(t, "micro") }}
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
    <div style={inkStack(t)}>
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
            style={{ paddingLeft: panelInset(t) }}
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
  captureField,
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
  captureField: FieldCapture;
}): JSX.Element {
  const freeform = mode === "freeform";
  return (
    <div style={stacked(t)}>
      <T
        size="caption"
        weight={emphasisWeight(t)}
        color={t.color.accent.base}
        style={paneInk(t)}
      >
        {freeform ? "Custom response" : "Extra context"}
      </T>
      {mode === "comment" && selections.length > 0 && (
        <T
          size="caption"
          color={muted}
          style={{ flexShrink: 0, ...paneInk(t) }}
        >
          {`Selected: ${selections.join(", ")}`}
        </T>
      )}
      <textarea
        autoFocus
        minRows={freeformOnly ? FREEFORM_FIELD.min : OPTION_FIELD.min}
        maxRows={freeformOnly ? FREEFORM_FIELD.max : OPTION_FIELD.max}
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
        ref={captureField}
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
  const { request, onCancel } = props;
  const { question } = request;
  const tone: ComposerTone = "awaiting";
  const muted = tintedMuted(t, tone);
  const chips: KbdColors = {
    fill: tintedFill(t, tone),
    border: tintedBorder(t, tone),
    color: tintedChipText(t, tone),
  };

  const renderer = useGpuixRequired();
  const fieldNode = useRef<number | null>(null);

  const captureField: FieldCapture = (node) => {
    fieldNode.current = node?.id ?? null;
  };

  const fieldOwnsFocus = (): boolean => ownsFocus(fieldNode.current, renderer);

  const windowSize = useWindowSize();
  const panelBand = composerPanelHeight(windowSize?.height);
  /** The question charges the field it stands the list under and the hint bar that closes it. */
  const maxVisibleRows = composerPanelRowsForHeight(t, panelBand, {
    statusBar: true,
  });

  // The cursor, the ticks, the filter and the drafts are an answer being built,
  // not a drawing: they live in the hook, and this component paints what they
  // add up to and routes the keys that move them.
  const {
    mode,
    allowMultiple,
    freeformOnly,
    query,
    rows,
    window: win,
    activeIndex,
    activeRow,
    activeOptionIndex,
    checked,
    checkedCount,
    selections,
    showList,
    draft,
    setQuery,
    setDraft,
    setCursor,
    setMode,
    move,
    jumpTo,
    activate,
    acceptAt,
    toggleActive,
    submitChecked,
    submitText,
    toggleComment,
    escape,
  } = useAskAnswer({
    request,
    initialMode: props.initialMode,
    onAnswer: props.onAnswer,
    onCancel,
    maxVisibleRows,
  });

  const runShortcut = (
    event: EventPayload,
    source: ShortcutSource,
  ): boolean => {
    // A full-screen picture is the window's one modal: while one is up its keys
    // belong to the picture, and Escape here would answer the question the reader
    // has not finished looking at.
    if (viewerHoldsKeys()) return false;
    if (event.isHeld === true) return false;
    const mods = modsOf(event);
    const match = matchShortcut(
      askShortcutSet(mode, allowMultiple),
      keyOf(event),
      mods,
    );
    if (match === null) return false;
    if (!claimShortcut(source, match.id, fieldOwnsFocus())) return false;
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
      mdLineHeight: lineBox(t, "micro"),
    },
  };
  const fieldStyle: StyleDesc = composerFieldLineStyle(t);

  const root: StyleDesc = {
    ...panelBox(t, tone),
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: panelBand,
    ...props.style,
  };

  return (
    <div style={root}>
      <T
        size="caption"
        weight={emphasisWeight(t)}
        color={t.color.text.primary}
        style={{ flexShrink: 0, ...paneInk(t) }}
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
            ref={captureField}
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
          value={draft}
          onDraft={setDraft}
          onSubmit={submitText}
          onFieldKey={onFieldKey}
          captureField={captureField}
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
