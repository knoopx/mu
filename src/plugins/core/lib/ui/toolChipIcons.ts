/**
 * The mark that names a header chip's figure.
 *
 * A chip line is a clipping budget and a word spends more of it than a mark:
 * `stars 812` becomes a star and 812, and a row of five chips fits the header of
 * a narrow window instead of losing its last chip to the clip. One list says
 * which noun has a mark, so the same figure wears the same mark in a repository
 * row, a revision row and a plot — and a noun this list does not vouch for keeps
 * its word rather than guessing at a glyph, because an adwaita icon the set does
 * not have silently draws a dot.
 *
 * Keys are the labels the plugins' own views state, lowercased; values are names
 * this app's icon set (`material-symbols`) actually carries.
 */

import type { IconName } from "adwaita-gpuix";

const GLYPH_OF_LABEL: Readonly<Record<string, IconName>> = {
  // A repository, as GitHub counts it.
  language: "code",
  stars: "star",
  forks: "fork-right",
  "open issues": "radio-button-checked",
  "last push": "cloud-upload",
  author: "person",
  "authored by": "person",
  "opened by": "person",
  account: "badge",
  repositories: "code",
  followers: "group",
  following: "person-add",
  // When a record happened, in one clock mark.
  created: "schedule",
  closed: "schedule",
  merged: "schedule",
  published: "schedule",
  // What a record is made of.
  branches: "merge-type",
  commits: "commit",
  labels: "label",
  replies: "chat",
  assets: "attachment",
  // A revision, as jj reads one.
  rev: "commit",
  commit: "commit",
  change: "change-history",
  revisions: "history",
  bookmark: "bookmark",
  path: "description",
  file: "description",
  files: "description",
  lines: "notes",
  // A plot's figures.
  points: "scatter-plot",
  series: "show-chart",
  range: "linear-scale",
  peak: "trending-up",
  // A tree's figures.
  tree: "account-tree",
  folders: "folder",
  leaves: "eco",
  depth: "layers",
  moved: "difference",
  // A diagram's page.
  canvas: "crop-free",
  svg: "image",
  "drew in": "timer",
  // What an analyser ran over, and what it scored.
  analyzer: "analytics",
  scope: "folder",
  "scope filter": "filter-alt",
  cc: "speed",
  cyclomatic: "speed",
  cognitive: "psychology",
  // `CRAP` wears no mark: four letters are already the shortest answer for a
  // figure no glyph names.
  "min risk": "warning",
  duplicated: "difference",
  groups: "category",
  functions: "functions",
  "files with clones": "content-copy",
  "entry point": "login",
  "entry points": "login",
  imports: "input",
  "read by": "link",
  reachable: "route",
  "in graph": "hub",
  // A program on the screen.
  program: "widgets",
  // What a guardrail is written against, and what proved it.
  rules: "shield",
  fixtures: "fact-check",
  // The parser a suite ran against, and the languages it can read.
  engine: "analytics",
  grammars: "code",
};

/** The mark a chip's label asks for, or null when the word is the only answer. */
export function chipGlyphOf(label: string): IconName | null {
  return GLYPH_OF_LABEL[label.trim().toLowerCase()] ?? null;
}
