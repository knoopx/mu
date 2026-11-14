/**
 * The screen a test asserts on.
 *
 * A story painted the whole window to a PNG and asked a person to look at it. A
 * test paints **the component under test** into the same GPU tree and asks the
 * tree what it drew: which words are on screen, where they stand, what a key or
 * a click does to it. Nothing else is mounted — no window chrome, no header bar,
 * no provider the component never reads.
 *
 * What answers is the real thing. `createTestRoot` opens GPUI's offscreen test
 * window and runs the same `GpuixView::render()` → `build_element()` →
 * `apply_styles()` → layout path production runs, and wires native input events
 * back through React's scheduler. So:
 *
 * - `getAllText()` is the retained element tree,
 * - `getPaintedText()` is every string painted in the last frame — the only
 *   reading that sees what `<code>`, `<diff>` and `<markdown>` draw inside GPUI,
 * - `getPaintedHighlights()` is the wash a search match or a cursor row draws,
 * - `getElementBounds()` is where layout actually put an element, not where a
 *   style string suggests it should be,
 * - `app.getByText(...).click()` and `.press()` go through GPUI's own hit
 *   testing and input pipeline, so a row that cannot be clicked in the test
 *   cannot be clicked in the app.
 */

import type { ReactNode } from "react";
import { createTestRoot } from "@gpuix/react/testing";
import { connectTest, type App, type Locator } from "@gpuix/react/automation";
import type { ElementBounds } from "@gpuix/native";
import type { TestElement, TestRenderer } from "@gpuix/native/testing";
import {
  AdwaitaProvider,
  TooltipProvider,
  type AccentKey,
  type ColorScheme,
} from "adwaita-gpuix";
import { useAdwaitaMuTheme } from "../src/plugins/core/lib/theme/adwaita";
import { MuProvider } from "../src/theme";

/** The window a component is laid out against. The app lays out against
 *  whatever window it is given, so a test names the width its claim is about. */
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 800;

/** The look a scene is painted under unless the test asks for another, so a
 *  colour or contrast claim means the same thing in every file. */
const DEFAULT_SCHEME: ColorScheme = "nightsky";

export interface StageOptions {
  width?: number;
  height?: number;
  scheme?: ColorScheme;
  accent?: AccentKey | null;
}

/** How far the tree may be driven before it counts as painted.
 *
 *  A ceiling, not a wait: the pump stops once the tree stops changing, so a
 *  component that renders in one pass is done in three frames and a virtual list
 *  measuring its rows is not cut short. Between frames the event loop turns,
 *  which is what lets a promise the component opened land — a resolved
 *  continuation is queued, not called, so a synchronous pump would paint the
 *  state from before the answer arrived. */
const SETTLE_CEILING = 32;
const SETTLE_STABLE_FRAMES = 3;
const SETTLE_MIN_FRAMES = 4;
const FRAME_MS = 16;

const turn = (): Promise<void> => new Promise((done) => setTimeout(done, 0));

const signatureOf = (renderer: TestRenderer): string => {
  let sum = renderer.getRetainedElementCount();
  for (const word of renderer.getAllText()) sum += word.length;
  for (const word of renderer.getPaintedText()) sum += word.length;
  return String(sum);
};

/** Drive frames, and the event loop between them, until the picture settles.
 *  True when the frame settled with something painted; false when the tree stopped
 *  changing while nothing was composited, which is a dead window rather than a slow
 *  one and is answered by opening another, not by pumping more frames. */
async function settle(renderer: TestRenderer): Promise<boolean> {
  let last = signatureOf(renderer);
  let stable = 0;
  for (let frame = 0; frame < SETTLE_CEILING; frame++) {
    await turn();
    renderer.advanceTime(FRAME_MS);
    renderer.flush();
    const now = signatureOf(renderer);
    // A frame that painted nothing is not a settled picture. A window can hold
    // its whole tree in the retained list while GPUI has composited no frame —
    // the signature over both would call that stable, and the suite would read a
    // screen that was never lit. Only a lit frame counts towards settling.
    const lit = renderer.getPaintedText().length > 0;
    stable = now === last && lit ? stable + 1 : 0;
    if (stable >= SETTLE_STABLE_FRAMES && frame + 1 >= SETTLE_MIN_FRAMES)
      return true;
    if (now === last && !lit && frame >= SETTLE_MIN_FRAMES + 2) return false;
    last = now;
  }
  return renderer.getPaintedText().length > 0;
}

/** One thing printed on screen, and where the layout put it. */
export interface Ink {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** the retained element that painted it, for a follow-up bounds read */
  element: TestElement;
}

export interface Screen {
  renderer: TestRenderer;
  app: App;

  /** Every string in the retained tree, in depth-first order. */
  words(): string[];

  /** Every string painted in the last frame, in paint order. */
  painted(): string[];

  /** The screen read as one block: tree and paint together, deduplicated. */
  all(): string;

  /** Whether a phrase is on screen at all (tree or paint). */
  says(needle: string): boolean;

  /** How many elements print exactly this. */
  countOf(exact: string): number;

  /** How many elements in the tree contain this — a fact stated once is 1. */
  mentions(needle: string): number;

  /** How many painted strings contain this, for what `<code>`, `<diff>` and
   *  `<markdown>` draw inside GPUI. */
  paintedMentions(needle: string): number;

  /** Every painted string, concatenated in paint order.
   *
   *  A highlighted block paints one string per syntax token, so a line of code
   *  arrives as `"return"`, `" Math."`, `"floor"`, … and a claim about the code
   *  has to be made against the line, not against a token. */
  joined(): string;

  /** How many times a phrase appears in the painted run — the count a line of
   *  code, a diff hunk or a markdown table can be checked against. */
  codeMentions(needle: string): number;

  /** Every element whose text contains `needle`, with its bounds. */
  inkOf(needle: string): Ink[];

  /** The single line of ink a claim is about; throws when it is ambiguous. */
  ink(needle: string): Ink;

  /** The x every printed line starts at, smallest first. */
  leftEdges(): number[];

  /** Every element of a host type ("text", "div", "img", "code", "diff", …). */
  every(type: string): TestElement[];

  /** Where layout put an element. */
  boundsOf(element: TestElement): ElementBounds | null;

  /** Locator over text, for a click or a key. */
  byText(needle: string): Locator;

  /** Locator over a `testId`. */
  byId(testId: string): Locator;

  /** Re-render with new props, then settle. */
  update(node: ReactNode): Promise<void>;

  /** Let the app answer — a promise it opened, a timer it set — then settle. */
  frame(): Promise<void>;

  /** Keys to whatever holds focus: the only way to prove `autoFocus` worked. */
  press(keystrokes: string): Promise<void>;

  /** Keys to one element, found by its text. */
  pressInto(needle: string, keystrokes: string): Promise<void>;

  /** A click at a point, through GPUI's hit testing. */
  clickAt(x: number, y: number): Promise<void>;

  /** A click on the centre of the first element printing `needle`. */
  clickOn(needle: string): Promise<void>;

  /** Move the pointer, which is how a hover state is proven. */
  moveTo(x: number, y: number): Promise<void>;

  /** The wash a search match or a cursor row draws, one entry per visual row. */
  highlights(): ReturnType<TestRenderer["getPaintedHighlights"]>;

  /** The text GPUI has selected, if any. */
  selection(): string | null;

  /** The frame, written out for a human to look at after the run. */
  shot(path: string): Promise<string>;

  unmount(): void;
}

/** A tree that reads the theme has to be inside one, and mu's own tokens ride
 *  beside it. Two providers, no chrome. */
function Themed(props: { children: ReactNode }): ReactNode {
  return <MuProvider theme={useAdwaitaMuTheme()}>{props.children}</MuProvider>;
}

const themed = (node: ReactNode, options: StageOptions): ReactNode => (
  <AdwaitaProvider
    scheme={options.scheme ?? DEFAULT_SCHEME}
    accent={options.accent ?? null}
  >
    <TooltipProvider delayDuration={400}>
      <Themed>{node}</Themed>
    </TooltipProvider>
  </AdwaitaProvider>
);

/** The screens this file has painted and not put away. */
const live: Screen[] = [];

/** Put away every screen painted so far. Call it from `afterEach`.
 *
 *  A test that throws leaves its screen standing, and a GPU window left open
 *  across a whole suite is a leak a reader cannot see from the test that caused
 *  it. */
export function releaseAll(): void {
  while (live.length > 0) {
    const screen = live.pop()!;
    try {
      screen.unmount();
    } catch {
      // A screen that will not close is already gone.
    }
  }
}

/**
 * Paint one component and hand back what is on screen.
 *
 * The caller wraps the component in only the providers it reads: adwaita's theme
 * is here because every mu component asks for its tokens, and a project or repo
 * source is added by the stage that reads one.
 */
export async function stage(
  node: ReactNode,
  options: StageOptions = {},
): Promise<Screen> {
  const { width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT } = options;
  const { renderer, render, unmount } = createTestRoot({ width, height });
  render(themed(node, options));
  await settle(renderer);
  const app = await connectTest(renderer);

  const texts = (): { element: TestElement; text: string }[] =>
    renderer
      .findByType("text")
      .map((element) => ({ element, text: element.text ?? "" }))
      .filter((entry) => entry.text !== "");

  const screen: Screen = {
    renderer,
    app,
    words: () => renderer.getAllText(),
    painted: () => renderer.getPaintedText(),
    all: () =>
      [
        ...new Set([...renderer.getAllText(), ...renderer.getPaintedText()]),
      ].join("\n"),
    says: (needle) =>
      renderer.getAllText().some((word) => word.includes(needle)) ||
      renderer.getPaintedText().some((word) => word.includes(needle)),
    countOf: (exact) => texts().filter((entry) => entry.text === exact).length,
    mentions: (needle) =>
      renderer.getAllText().filter((word) => word.includes(needle)).length,
    paintedMentions: (needle) =>
      renderer.getPaintedText().filter((word) => word.includes(needle)).length,
    joined: () => renderer.getPaintedText().join(""),
    codeMentions: (needle) =>
      renderer.getPaintedText().join("").split(needle).length - 1,
    inkOf: (needle) =>
      texts()
        .filter((entry) => entry.text.includes(needle))
        .map((entry) => {
          const bounds = renderer.getElementBounds(entry.element.id);
          return {
            text: entry.text,
            x: bounds?.x ?? Number.NaN,
            y: bounds?.y ?? Number.NaN,
            width: bounds?.width ?? Number.NaN,
            height: bounds?.height ?? Number.NaN,
            element: entry.element,
          };
        }),
    ink: (needle) => {
      const found = screen.inkOf(needle);
      if (found.length === 0)
        throw new Error(
          `nothing on screen says "${needle}" — the screen says: ${screen
            .words()
            .slice(0, 24)
            .join(" | ")}`,
        );
      if (found.length > 1)
        throw new Error(
          `"${needle}" is printed ${found.length} times — narrow the claim`,
        );
      return found[0]!;
    },
    every: (type) => renderer.findByType(type),
    boundsOf: (element) => renderer.getElementBounds(element.id),
    leftEdges: () =>
      [
        ...new Set(
          texts().map(
            (entry) => renderer.getElementBounds(entry.element.id)?.x ?? -1,
          ),
        ),
      ].sort((a, b) => a - b),
    byText: (needle) => app.getByText(needle),
    byId: (testId) => app.getByTestId(testId),
    update: async (next) => {
      render(themed(next, options));
      await settle(renderer);
    },
    frame: async () => {
      await settle(renderer);
    },
    press: async (keystrokes) => {
      await app.call("keystrokes", { keys: keystrokes });
      await settle(renderer);
    },
    pressInto: async (needle, keystrokes) => {
      const found = screen.inkOf(needle)[0];
      if (found === undefined)
        throw new Error(`nothing on screen says "${needle}"`);
      await app.call("keystrokes", {
        keys: keystrokes,
        elementId: found.element.id,
      });
      await settle(renderer);
    },
    clickAt: async (x, y) => {
      await app.mouse.click({ x, y });
      await settle(renderer);
    },
    clickOn: async (needle) => {
      await screen.byText(needle).click();
      await settle(renderer);
    },
    moveTo: async (x, y) => {
      await app.mouse.move({ x, y });
      await settle(renderer);
    },
    highlights: () => renderer.getPaintedHighlights(),
    selection: () => renderer.getSelectedText(),
    shot: async (path) => app.screenshot({ path }),
    unmount: () => {
      const at = live.indexOf(screen);
      if (at >= 0) live.splice(at, 1);
      void app.close();
      unmount();
    },
  };
  live.push(screen);
  return screen;
}
