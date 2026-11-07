import {
  SHORT_CHANGE_ID,
  VCS_DESCRIBE_TOOL,
  VCS_FILE_SPLIT_TOOL,
  VCS_HUNK_LIST_TOOL,
  VCS_HUNK_SPLIT_TOOL,
} from "../constants";

const PANEL = "[changes panel]";

const authoring =
  "Author the message yourself from the diff you read: a conventional-commit subject under 72 characters, and body bullets when the change does more than one thing.";

const authoringEach =
  "Author a message for each change yourself from the diff you read for it: a conventional-commit subject under 72 characters, and body bullets when that change does more than one thing.";

const bounds =
  "Do only this write: no rebase, abandon, squash, restore, reset or undo, nothing in the working copy, and no mutating jj command in bash — the write goes through the vcs tool.";

const noInsertAfter = "Do not set insertAfter.";

/** A revision is named by the change id the panel shows; jj resolves the prefix. */
const shortId = (changeId: string): string =>
  changeId.slice(0, SHORT_CHANGE_ID);

/** Change ids listed in the order the panel had them. */
const shortIds = (changeIds: string[]): string =>
  changeIds.map(shortId).join(", ");

/** The only diff command an instruction hands to bash; the read tools cover the rest. */
const jjDiff = (changeId: string): string => `jj diff -r ${shortId(changeId)}`;

const quoted = (text: string): string =>
  `"${text.replace(/\s+/g, " ").trim()}"`;

/** What the change says now, so the agent edits a description instead of losing one. */
const described = (description: string): string =>
  description.trim().length > 0
    ? `described ${quoted(description)}`
    : "still undescribed";

const listed = (values: string[]): string =>
  values.map((value) => `"${value}"`).join(", ");

/**
 * The instruction behind the changes panel's describe key: the agent reads every
 * targeted change, writes a message for it, and calls vcs-describe(hash, message)
 * once per change id. currentDescriptions is index-aligned with targets and may
 * hold empty strings for changes that have no description yet.
 */
export function describeInstruction(
  targets: string[],
  currentDescriptions: string[],
): string {
  const ids = targets.map(shortId);
  const asked =
    ids.length === 1
      ? `change ${ids[0] ?? ""}`
      : `these changes: ${shortIds(targets)}`;
  return [
    `${PANEL} The user pressed describe on ${asked}. This write is their explicit request.`,
    ...targets.map(
      (id, index) =>
        `- read it with \`${jjDiff(id)}\` — currently ${described(currentDescriptions[index] ?? "")}`,
    ),
    ids.length === 1 ? authoring : authoringEach,
    `Then call \`${VCS_DESCRIBE_TOOL}(hash, message)\` once per change, with hash set to that change id.`,
    bounds,
  ].join("\n");
}

/**
 * The instruction behind the panel's split keys. With files the agent splits
 * exactly those files out of the change; without it the agent groups the change
 * into coherent commits by file, one vcs-file-split per group. Either way the
 * named files land in the first/bottom commit with the given message and the
 * rest stay in the second/top commit with the existing description.
 */
export function splitFilesInstruction(
  changeId: string,
  description: string,
  files?: string[],
): string {
  const id = shortId(changeId);
  const named = (files ?? [])
    .map((file) => file.trim())
    .filter((file) => file.length > 0);
  const read = `Read the change first with \`${jjDiff(changeId)}\` — it is ${described(description)}, and the split must name files it actually changes.`;
  if (named.length > 0)
    return [
      `${PANEL} The user pressed split on \`${named[0] ?? ""}\` in change ${id}. This write is their explicit request.`,
      read,
      `Move exactly ${named.length === 1 ? "that file" : "those files"} out with \`${VCS_FILE_SPLIT_TOOL}(rev="${id}", files=[${listed(named)}], message)\`: the named files go to the first/bottom commit and take the message you give; the remaining files stay in the second/top commit and keep the description above.`,
      authoring,
      `${noInsertAfter} Report both change ids — which holds the moved files and which holds the rest.`,
      bounds,
    ].join("\n");
  return [
    `${PANEL} The user pressed split on change ${id}. This write is their explicit request.`,
    read,
    `Split it into coherent commits by file: group the files it changes so each commit does one thing, then call \`${VCS_FILE_SPLIT_TOOL}(rev, files, message)\` once per group — the named files go to the first/bottom commit with your message, everything else stays in the second/top commit with the description above.`,
    `Chain the calls: each \`rev\` is the remaining change id the previous call reported, and stop when one group is left.`,
    `${authoring} ${noInsertAfter} Report the commits you made, with their change ids and files.`,
    bounds,
  ].join("\n");
}

/**
 * The instruction behind the files pane's split-hunk key: the agent lists the
 * hunks of one file with vcs-hunk-list(rev, files), then calls
 * vcs-hunk-split(rev, hunks, message) on the ones that form a single coherent
 * change. Those hunks stay in the change with the new message and the rest move
 * to a new child commit stacked on top.
 */
export function splitHunksInstruction(
  changeId: string,
  description: string,
  path: string,
): string {
  const id = shortId(changeId);
  return [
    `${PANEL} The user pressed split-hunk on \`${path}\` in change ${id}. This write is their explicit request.`,
    `List that file's hunks first with \`${VCS_HUNK_LIST_TOOL}(rev="${id}", files="${path}")\`, and read the change with \`${jjDiff(changeId)}\` — it is ${described(description)}.`,
    `Pick the hunks that form one coherent change and call \`${VCS_HUNK_SPLIT_TOOL}(rev="${id}", hunks=["${path}=hunk-..."], message)\`, using the full \`hunk-\` ids from that listing — a stale or truncated id matches nothing.`,
    `${authoring} ${noInsertAfter}`,
    `The selected hunks stay in ${id} and take your message; the rest move to a new child commit stacked on top. Report which hunks moved and which stayed, with both change ids.`,
    bounds,
  ].join("\n");
}
