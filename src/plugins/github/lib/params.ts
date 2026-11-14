/**
 * The parameters the nine GitHub tools share.
 *
 * Every read is pointed at an owner and a repository, and most of them can be
 * told which ref, which path, how many rows and whether to skip the cache. Those
 * bounds are written once here so a ceiling change is one edit and a tool's own
 * schema only names what only it can name — a number, a sha, a tag, a login.
 */

import { Type } from "typebox";

/** The owner half of a repository: a user or organisation login. */
export const ownerParam = () =>
  Type.String({
    minLength: 1,
    pattern: "^\\s*\\S",
    description:
      "Repository owner — the user or organisation login, as the URL has it.",
  });

/** The repository half, without its owner. */
export const repoParam = () =>
  Type.String({
    minLength: 1,
    pattern: "^\\s*\\S",
    description: "Repository name, without the owner.",
  });

/** Which ref to read, when the repository's own default branch is not wanted. */
export const refParam = () =>
  Type.Optional(
    Type.String({
      minLength: 1,
      description:
        "Branch, tag or commit SHA to read from; empty is the repository's default branch.",
    }),
  );

/** Where in the repository. */
export const pathParam = (one: string) =>
  Type.String({
    minLength: 1,
    description: `Repository-relative ${one}, e.g. \`src/plugins/github/tools/githubRepo.ts\`.`,
  });

/** A pull request or issue number, as its URL shows it. */
export const numberParam = (what: string) =>
  Type.Number({
    minimum: 1,
    description: `The ${what} number, exactly as its URL shows it.`,
  });

/**
 * What a search call may ask for. The literals are the `SEARCH_KINDS` list
 * spelled out, because the schema has to name each one for the model to pick it.
 */
export const kindParam = () =>
  Type.Optional(
    Type.Union(
      [
        Type.Literal("repositories"),
        Type.Literal("code"),
        Type.Literal("issues"),
        Type.Literal("commits"),
        Type.Literal("users"),
      ],
      {
        description:
          "What to search (default `repositories`). `code` and `commits` are signed-in reads and answer `unsupported` without a token.",
      },
    ),
  );

/** A commit, full or abbreviated: GitHub takes the prefix. */
export const shaParam = () =>
  Type.String({
    minLength: 4,
    pattern: "^\\s*[0-9a-fA-F]",
    description:
      "Commit SHA — full or abbreviated, as any GitHub URL shows it.",
  });

/** A user or organisation, whether or not they own a repository. */
export const loginParam = () =>
  Type.String({
    minLength: 1,
    pattern: "^\\s*\\S",
    description:
      "A GitHub login — a user or an organisation, without the leading `@`.",
  });

/** How many rows a bounded read answers with. */
export const limitParam = (unit: string, fallback: number, max: number) =>
  Type.Optional(
    Type.Number({
      minimum: 0,
      maximum: max,
      description: `How many ${unit} to return (default ${String(fallback)}, maximum ${String(max)}).`,
    }),
  );

/** An extra list a read can bring along. */
export const flagParam = (description: string) =>
  Type.Optional(Type.Boolean({ description }));

/**
 * The way back to a live read. A GitHub read is cached for a day, which is what
 * a research session wants and what a "did the upstream merge it yet?" question
 * does not.
 */
export const refreshParam = () =>
  Type.Optional(
    Type.Boolean({
      description: "Skip mu's 24h cache of this answer and read GitHub live.",
    }),
  );
