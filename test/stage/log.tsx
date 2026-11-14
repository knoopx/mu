/**
 * The log, without the window.
 *
 * Every claim a tool row makes lives in one row: what its header says, which
 * figures ride that header, what the card underneath it holds, and whether the
 * row's ink stands in the log's one text column. None of that needs a status bar,
 * a project card or a composer, so none of it is mounted here.
 *
 * What is mounted is the app's own row components — `TranscriptRow` picks the
 * same surface for the same item the window picks, `ToolExecution` reads the same
 * plugin host, and the page inset is the log's own constant — so a row that
 * passes here is the row the window draws.
 */

import type { JSX, ReactNode } from "react";
import type { StyleDesc } from "@gpuix/react";
import { useAdwaita } from "adwaita-gpuix";
import {
  TranscriptRow,
  transcriptRowGap,
  withRowSpacers,
} from "../../src/plugins/core/screens/Chat";
import { supersededOf } from "../../src/plugins/openui/lib/fences/supersession";
import {
  ProjectSourceProvider,
  type ProjectSource,
} from "../../src/plugins/core/components/ProjectSource";
import {
  RepoSourceProvider,
  type RepoSource,
} from "../../src/plugins/vcs/components/RepoSource";
import { PAGE_INSET } from "../../src/plugins/core/lib/ui/transcriptLayout";
import { paneFill } from "../../src/plugins/core/lib/ui/theme";
import type { TranscriptItem } from "../../src/plugins/core/lib/agent/transcriptState";
import type { TurnStats } from "../../src/plugins/core/lib/agent/turnStats";
import { stage, type Screen, type StageOptions } from "../harness";
import { STAGE_SOURCE } from "../fixtures/stage";
import { STAGE_REPO } from "../fixtures/repo";

/** The log's column, unpadded on purpose: every row brings its own page inset,
 *  which is the rule the row's own geometry is written against. A stage that
 *  padded it again would measure 112 where the app measures 56. */
function logColumn(gap: number): StyleDesc {
  return {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 0,
    gap,
  };
}

export interface LogScene {
  items: readonly TranscriptItem[];

  /** the turn footers, which a row is only drawn with when the window has them */
  stats?: ReadonlyMap<string, TurnStats>;

  /** a source for a row that reads the project — a read preview, a diff */
  project?: ProjectSource;

  /** a source for a row that reads the repository */
  repo?: RepoSource;
}

/** A run of rows, in the order the agent made them. */
export function LogSceneView(scene: LogScene): JSX.Element {
  const t = useAdwaita();
  // A `ui` block belongs to the reply it stands in, named by that reply's place
  // among the conversation's replies; a reply followed by a user message has been
  // answered and its block's questions closed. The stage hands its rows the same
  // two facts the window does, and spaces them with the log's own gap.
  const answered = supersededOf(scene.items);
  let replies = -1;
  const rows = withRowSpacers(
    scene.items.map(
      (item, index): JSX.Element => (
        <TranscriptRow
          key={item.id}
          item={item}
          stats={scene.stats?.get(item.id)}
          uiMessage={item.kind === "assistant" ? (replies += 1) : -1}
          answered={answered[index] === true}
        />
      ),
    ),
    transcriptRowGap(t),
  );
  const body = <div style={logColumn(0)}>{rows}</div>;
  const wrapped =
    scene.project === undefined && scene.repo === undefined ? (
      body
    ) : scene.repo === undefined ? (
      <ProjectSourceProvider source={scene.project ?? STAGE_SOURCE}>
        {body}
      </ProjectSourceProvider>
    ) : (
      <ProjectSourceProvider source={scene.project ?? STAGE_SOURCE}>
        <RepoSourceProvider source={scene.repo ?? STAGE_REPO}>
          {body}
        </RepoSourceProvider>
      </ProjectSourceProvider>
    );
  return (
    <div style={{ backgroundColor: paneFill(t), height: "100%" }}>
      {wrapped}
    </div>
  );
}

/** Paint a scene's rows and hand back what is on screen. */
export const logScene = async (
  scene: LogScene,
  options: StageOptions = {},
): Promise<Screen> => stage(<LogSceneView {...scene} />, options);

/** Paint one call's row: the atom most row claims are about. */
export const logRow = async (
  item: TranscriptItem,
  options: StageOptions = {},
): Promise<Screen> =>
  logScene({ items: [item], project: STAGE_SOURCE, repo: STAGE_REPO }, options);

/** The window's page inset, so a row's column claim names the constant rather
 *  than a number that happens to match today. */
export const INSET = PAGE_INSET;

/** Every piece of ink the stage painted, with where layout put it. */
export const ink = (screen: Screen) => screen.inkOf("");

/** Ink that stands left of the log's one text column — a row that picked a
 *  second column, which the log's grid does not allow. */
export const inkLeftOfColumn = (screen: Screen) =>
  ink(screen).filter((entry) => entry.x < INSET);

/** The column every line of body text starts at, read off the screen. */
export const textColumn = (screen: Screen): number =>
  Math.min(...ink(screen).map((entry) => entry.x));
