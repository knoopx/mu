import {
  hints,
  matchShortcut,
  navShortcuts,
  type Shortcut,
} from "adwaita-gpuix/shortcuts";

export { matchShortcut };
export type { Shortcut } from "adwaita-gpuix/shortcuts";

const FILTER_PREFIX: Array<[string, string]> = [
  ["ctrl", "d"],
  ["ctrl", "t"],
  ["ctrl", "u"],
  ["ctrl", "l"],
  ["ctrl", "a"],
];

export const TREE_SHORTCUTS: Shortcut[] = [
  ...navShortcuts({ select: "nav" }),
  {
    id: "filter-default",
    kbds: [FILTER_PREFIX[0]],
    desc: "default view",
    hidden: true,
  },
  {
    id: "filter-no-tools",
    kbds: [FILTER_PREFIX[1]],
    desc: "no tools",
    hidden: true,
  },
  {
    id: "filter-user",
    kbds: [FILTER_PREFIX[2]],
    desc: "user only",
    hidden: true,
  },
  {
    id: "filter-labeled",
    kbds: [FILTER_PREFIX[3]],
    desc: "labeled",
    hidden: true,
  },
  {
    id: "filter-all",
    kbds: [FILTER_PREFIX[4]],
    desc: "everything",
    hidden: true,
  },
  {
    id: "branch-up",
    kbds: [["ctrl", "left"]],
    desc: "branch",
    hidden: true,
  },
  {
    id: "branch-down",
    kbds: [["ctrl", "right"]],
    desc: "branch",
    hidden: true,
  },
  { id: "filter-cycle", kbds: [["ctrl", "o"]], desc: "filter" },
  { id: "jump", kbds: ["enter"], desc: "jump here" },
  { id: "close", kbds: ["escape"], desc: "close" },
];

export const TREE_HINTS: Shortcut[] = hints(TREE_SHORTCUTS);

export const TREE_FILTER_ACTION: Record<string, string> = {
  "filter-default": "no-tools",
  "filter-no-tools": "no-tools",
  "filter-user": "user-only",
  "filter-labeled": "labeled-only",
  "filter-all": "all",
};
