/**
 * What every GitHub tool tells the model about the plugin.
 *
 * The nine tools share four rules of use, and a bullet per tool would be nine
 * chances to say them differently. Each tool adds its own one or two lines to
 * what is here.
 */

export const GITHUB_GUIDELINES: readonly string[] = [
  "Read GitHub with the github-* tools — repository facts, remote files and folders, pull requests, issues, releases, commits and search — rather than shelling out to `gh` or curling api.github.com.",
  'Every repository read names `owner` and `repo`; a name you are unsure of comes from github-search with kind="repositories".',
  "A 404 means the owner, repo, ref, path or number is wrong, not that GitHub is down — re-read the scope in the row's chips before calling again.",
  "Answers are cached for 24 hours, so a research session does not spend its rate limit rereading the same page; pass `refresh` when the answer has to be current.",
];

/** The line that keeps a read pointed at the right kind of thing. */
export const FILE_OR_FOLDER =
  "github-tree lists a folder and github-file reads one file: a path answered 404 is often the wrong one of those two.";
