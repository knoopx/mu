import type { JSX } from "react";
import {
  Badge,
  Icon,
  Spinner,
  T,
  useAdwaita,
  type AdwaitaTheme,
  type BadgeVariant,
  type IconName,
} from "adwaita-gpuix";
import type { StyleDesc } from "@gpuix/react";

import { ToolCaptionLine } from "../../core/components/ToolCaptionLine";
import { ToolStateLine } from "../../core/components/ToolStateLine";
import { mutedText } from "../../core/lib/ui/theme";
import { INLINE_GLYPH, STATE_GLYPH, emphasisWeight } from "../../core/lib/ui/tokens";
import {
  toolCell,
  toolColumn,
  toolGrow,
  toolLine,
} from "../../core/lib/ui/toolRows";
import type { ToolTranscriptItem } from "../../core/lib/agent/transcriptState";
import {
  GUARDRAILS_COVERAGE_TOOL,
  GUARDRAILS_FIXTURE_TOOL,
  GUARDRAILS_TEST_TOOL,
} from "../constants";
import { engineLabel } from "../lib/panelRows";
import type {
  GuardrailsCoverageDetails,
  GuardrailsFixtureUpdateDetails,
  GuardrailsTestDetails,
} from "../types";

const TOOL_NAMES: readonly string[] = [
  GUARDRAILS_TEST_TOOL,
  GUARDRAILS_FIXTURE_TOOL,
  GUARDRAILS_COVERAGE_TOOL,
];

const RUNNING_TEXT: Record<string, string> = {
  [GUARDRAILS_TEST_TOOL]: "running the suite",
  [GUARDRAILS_FIXTURE_TOOL]: "writing fixtures",
  [GUARDRAILS_COVERAGE_TOOL]: "reading sessions",
};

export function isGuardrailsTool(name: string): boolean {
  return TOOL_NAMES.includes(name.toLowerCase());
}

function detailsOf<T>(item: ToolTranscriptItem): T | null {
  const details = item.details;
  return typeof details === "object" && details !== null
    ? (details as T)
    : null;
}

export function guardrailsToolPreview(item: ToolTranscriptItem): string {
  const name = item.name.toLowerCase();
  if (item.status === "running") return RUNNING_TEXT[name] ?? "guardrails";
  if (item.status === "error") return `${name} failed`;

  if (name === GUARDRAILS_TEST_TOOL) {
    const details = detailsOf<GuardrailsTestDetails>(item);
    if (details === null) return detailsNoteOf(item);
    if (details.total === 0) return details.note;
    return details.fail === 0
      ? `${details.pass}/${details.total} pass · ${details.suites.join(", ")}`
      : `${details.pass}/${details.total} pass · ${details.fail} fail`;
  }
  if (name === GUARDRAILS_FIXTURE_TOOL) {
    const details = detailsOf<GuardrailsFixtureUpdateDetails>(item);
    if (details === null) return detailsNoteOf(item);
    return `${details.written} written · ${details.deleted} deleted${
      details.failed === 0 ? "" : ` · ${details.failed} failed`
    }`;
  }
  if (name === GUARDRAILS_COVERAGE_TOOL) {
    const details = detailsOf<GuardrailsCoverageDetails>(item);
    if (details === null) return detailsNoteOf(item);
    const never = details.rows.filter((row) => row.never).length;
    return `${details.rows.length} domains · ${never} never fired`;
  }
  return "guardrails";
}

const detailsNoteOf = (item: ToolTranscriptItem): string =>
  item.output.trim().split("\n")[0] ?? "";

const mono = (t: AdwaitaTheme): StyleDesc => ({
  flexShrink: 1,
  minWidth: 0,
  fontFamily: t.type.fontFamilyMono,
});

function Chip({
  label,
  variant,
  icon,
}: {
  label: string;
  variant: BadgeVariant;
  icon?: IconName;
}): JSX.Element {
  return (
    <Badge size="sm" variant={variant} icon={icon} style={{ flexShrink: 0 }}>
      {label}
    </Badge>
  );
}

function Head({ text }: { text: string }): JSX.Element {
  const t = useAdwaita();
  return <ToolCaptionLine text={text} color={mutedText(t)} />;
}

function Note({
  text,
  failed,
}: {
  text: string;
  failed?: boolean;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <ToolStateLine
      icon={failed === true ? "warning" : "info"}
      color={
        failed === true
          ? t.color.functional.destructive
          : t.color.text.secondary
      }
      text={text}
    />
  );
}

function Summary({
  parts,
  tone,
}: {
  parts: readonly string[];
  tone: "ok" | "bad";
}): JSX.Element {
  const t = useAdwaita();
  return (
    <ToolCaptionLine
      text={parts.join(" · ")}
      color={tone === "bad" ? t.color.functional.destructive : mutedText(t)}
      weight={emphasisWeight(t)}
    />
  );
}

function Running({ text }: { text: string }): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={toolLine(t)}>
      <Spinner
        size={STATE_GLYPH}
        color="accent"
        style={{ flexShrink: 0 }}
      />
      <T size="caption" color={mutedText(t)} style={toolGrow}>
        {text}
      </T>
    </div>
  );
}

function Failed({ text }: { text: string }): JSX.Element {
  return <Note text={text === "" ? "The tool call failed" : text} failed />;
}

function TestRows({
  details,
}: {
  details: GuardrailsTestDetails;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={toolColumn(t)}>
      <Head
        text={`${details.suites.length === 0 ? "no suites" : `suites ${details.suites.join(", ")}`} · ${engineLabel(details.engine)}`}
      />
      {details.note === "" ? null : <Note text={details.note} />}
      <div>
        {details.rows.map((row, index) => (
          <div key={`${row.domain}/${row.id}`} style={toolCell(t, index === 0)}>
            <div style={toolLine(t)}>
              <Chip
                label={row.status === "PASS" ? "pass" : "fail"}
                variant={row.status === "PASS" ? "success" : "destructive"}
                icon={row.status === "PASS" ? "check" : "close"}
              />
              <T size="list" style={mono(t)}>
                {row.id}
              </T>
              <T
                size="caption"
                color={mutedText(t)}
                align="right"
                style={{ flexShrink: 0 }}
              >
                {row.status === "PASS"
                  ? row.want
                    ? "blocked"
                    : "released"
                  : row.want
                    ? "wants a block"
                    : "wants release"}
              </T>
            </div>
            {row.detail === "" && row.status === "PASS" ? null : (
              <div style={toolLine(t)}>
                <T
                  size="caption"
                  color={
                    row.status === "PASS"
                      ? mutedText(t)
                      : t.color.functional.destructive
                  }
                  style={mono(t)}
                >
                  {`$ ${row.command}`}
                </T>
              </div>
            )}
            {row.detail === "" ? null : (
              <div style={toolLine(t)}>
                <T
                  size="caption"
                  color={t.color.functional.destructive}
                  style={toolGrow}
                >
                  {row.detail}
                </T>
              </div>
            )}
          </div>
        ))}
      </div>
      {details.total === 0 ? null : (
        <Summary
          tone={details.fail === 0 ? "ok" : "bad"}
          parts={[
            `pass=${details.pass}`,
            `fail=${details.fail}`,
            `total=${details.total}`,
          ]}
        />
      )}
    </div>
  );
}

function FixtureRows({
  details,
}: {
  details: GuardrailsFixtureUpdateDetails;
}): JSX.Element {
  const t = useAdwaita();
  return (
    <div style={toolColumn(t)}>
      <Head
        text={
          details.before < 0
            ? `${details.domain} · new suite`
            : `${details.domain} · ${details.before} ${
                details.before === 1 ? "fixture" : "fixtures"
              } before`
        }
      />
      <div>
        {details.ops.map((entry, index) => (
          <div
            key={`${entry.op}/${entry.id}/${index}`}
            style={toolCell(t, index === 0)}
          >
            <div style={toolLine(t)}>
              <Icon
                name={entry.op === "write" ? "noteAdd" : "delete"}
                size={INLINE_GLYPH}
                color={
                  entry.status === "ok"
                    ? mutedText(t)
                    : t.color.functional.destructive
                }
                style={{ flexShrink: 0 }}
              />
              <T size="list" style={mono(t)}>
                {entry.id}
              </T>
              <T
                size="caption"
                color={mutedText(t)}
                align="right"
                style={{ flexShrink: 0 }}
              >
                {entry.op === "write"
                  ? entry.detail === "updated"
                    ? "updated"
                    : "added"
                  : "deleted"}
              </T>
            </div>
            {entry.status === "ok" ? null : (
              <div style={toolLine(t)}>
                <T
                  size="caption"
                  color={t.color.functional.destructive}
                  style={toolGrow}
                >
                  {entry.detail}
                </T>
              </div>
            )}
          </div>
        ))}
      </div>
      <Summary
        tone={details.failed === 0 ? "ok" : "bad"}
        parts={[
          `written=${details.written}`,
          `deleted=${details.deleted}`,
          `failed=${details.failed}`,
        ]}
      />
      {details.path === "" ? null : (
        <div style={toolLine(t)}>
          <T size="micro" color={mutedText(t)} style={mono(t)}>
            {details.path}
          </T>
        </div>
      )}
    </div>
  );
}

function CoverageRows({
  details,
}: {
  details: GuardrailsCoverageDetails;
}): JSX.Element {
  const t = useAdwaita();
  const window =
    details.windowDays === 0 ? "every session" : `last ${details.windowDays}d`;
  return (
    <div style={toolColumn(t)}>
      <Head text={`${details.dir} · ${window} · ${details.files} files`} />
      {details.note === "" ? null : <Note text={details.note} />}
      <div>
        {details.rows.map((row, index) => (
          <div key={row.domain} style={toolCell(t, index === 0)}>
            <div style={toolLine(t)}>
              <T
                size="list"
                color={row.blocks === 0 ? mutedText(t) : t.color.text.primary}
                align="right"
                style={{ width: t.space.xl, flexShrink: 0 }}
              >
                {String(row.blocks)}
              </T>
              <T size="list" style={toolGrow}>
                {row.domain}
              </T>
              {row.source === "legacy" ? (
                <Chip label="legacy" variant="secondary" />
              ) : null}
              {row.never ? (
                <Chip label="never" variant="warning" icon="warning" />
              ) : (
                <T
                  size="caption"
                  color={mutedText(t)}
                  align="right"
                  style={{ flexShrink: 0 }}
                >
                  {row.last === "" ? "" : `${row.last} ago`}
                </T>
              )}
            </div>
          </div>
        ))}
      </div>
      <Summary
        tone="ok"
        parts={[
          `domains=${details.rows.length}`,
          `rules=${details.ruleCount}`,
          `never=${details.rows.filter((row) => row.never).length}`,
        ]}
      />
    </div>
  );
}

export function GuardrailsToolRows({
  item,
}: {
  item: ToolTranscriptItem;
}): JSX.Element {
  const name = item.name.toLowerCase();
  if (item.status === "error") return <Failed text={item.output.trim()} />;
  if (item.status === "running")
    return <Running text={RUNNING_TEXT[name] ?? "guardrails"} />;

  if (name === GUARDRAILS_TEST_TOOL) {
    const details = detailsOf<GuardrailsTestDetails>(item);
    return details === null ? (
      <Failed text={item.output.trim()} />
    ) : (
      <TestRows details={details} />
    );
  }
  if (name === GUARDRAILS_FIXTURE_TOOL) {
    const details = detailsOf<GuardrailsFixtureUpdateDetails>(item);
    return details === null ? (
      <Failed text={item.output.trim()} />
    ) : (
      <FixtureRows details={details} />
    );
  }
  if (name === GUARDRAILS_COVERAGE_TOOL) {
    const details = detailsOf<GuardrailsCoverageDetails>(item);
    return details === null ? (
      <Failed text={item.output.trim()} />
    ) : (
      <CoverageRows details={details} />
    );
  }
  return <Failed text={item.output.trim()} />;
}
