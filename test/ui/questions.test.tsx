/**
 * The fork that needs a person: the question in the log and the question in the
 * composer.
 *
 * A question is a choice the model cannot make alone. The log says a question is
 * open and how many there are; the composer holds the question itself — what is
 * asked, why it is asked, what each option would do, and the keys that answer it.
 * One fact, stated once: the choice is never in both places at once.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll, stage } from "../harness";
import { logScene } from "../stage/log";
import { AskComposer } from "../../src/plugins/interaction/components/AskComposer";
import type { AskResponse } from "../../src/plugins/interaction/types";
import { ASK_FORK_ITEMS, ASK_FORK_REQUESTS } from "../fixtures/scenes/ask-fork";

afterEach(releaseAll);

const askStage = async (
  index: number,
  answers: AskResponse[],
  cancelled: number[],
) =>
  stage(
    <AskComposer
      request={ASK_FORK_REQUESTS[index]!}
      onAnswer={(response) => answers.push(response)}
      onCancel={() => cancelled.push(1)}
    />,
    { width: 1280, height: 800 },
  );

describe("the question in the log", () => {
  test("a running ask row counts its questions and says where they are answered", async () => {
    const screen = await logScene({ items: ASK_FORK_ITEMS });
    expect(screen.says("ask-user")).toBe(true);
    expect(screen.says("2 questions")).toBe(true);
    expect(screen.says("Waiting for the answer in the composer")).toBe(true);
    // The row is marked as running with the same spinner the window uses.
    expect(screen.inkOf("\u2839").length).toBe(1);
  });

  test("the log does not hold the choice itself", async () => {
    const screen = await logScene({ items: ASK_FORK_ITEMS });
    // The options belong to the composer, where they can be answered; a second
    // copy in the log would be a choice a reader could read but not take.
    expect(screen.says("Delete the file (Recommended)")).toBe(false);
    expect(screen.says("Rewrite the two rules to read file sources")).toBe(
      false,
    );
  });
});

describe("the question in the composer", () => {
  test("it states the question, and the reason for asking it", async () => {
    const screen = await askStage(0, [], []);
    expect(
      screen.says(
        "`legacy-python.json` has not blocked anything in nine weeks. Retire it, or keep it?",
      ),
    ).toBe(true);
    // A person cannot choose without the figures the choice is made of.
    expect(screen.says("Coverage says:")).toBe(true);
    expect(screen.says("legacy-python 0")).toBe(true);
  });

  test("every option is one row, and the row under the cursor says what it would do", async () => {
    const screen = await askStage(0, [], []);
    expect(screen.says("Delete the file (Recommended)")).toBe(true);
    expect(screen.says("Rewrite the two rules to read file sources")).toBe(
      true,
    );
    expect(screen.says("Leave it armed")).toBe(true);
    expect(
      screen.says("its two cases are already covered by the file-domain rules"),
    ).toBe(true);
    // The recommended option stands first, and the cursor starts on it.
    const recommended = screen.inkOf("(Recommended)")[0]!;
    const rewrite = screen.inkOf(
      "Rewrite the two rules to read file sources",
    )[0]!;
    expect(recommended.y).toBeLessThan(rewrite.y);
  });

  test("the panel prints the keys it takes", async () => {
    const screen = await askStage(0, [], []);
    const ink = screen.inkOf("").map((entry) => entry.text);
    expect(ink).toContain("Select");
    expect(ink).toContain("Answer");
    expect(ink).toContain("Cancel");
  });

  test("Enter answers with the option under the cursor", async () => {
    const answers: AskResponse[] = [];
    const screen = await askStage(0, answers, []);
    await screen.press("enter");
    expect(answers.length).toBe(1);
    expect(answers[0]!.kind).toBe("selection");
    expect(
      answers[0]!.kind === "selection" && answers[0]!.selections,
    ).toContain("Delete the file (Recommended)");
  });

  test("the arrows move the choice, and the answer moves with it", async () => {
    const answers: AskResponse[] = [];
    const screen = await askStage(0, answers, []);
    await screen.press("down");
    await screen.press("enter");
    expect(
      answers[0]!.kind === "selection" && answers[0]!.selections.join(" "),
    ).toContain("Rewrite the two rules to read file sources");
  });

  test("Cancel is its own answer, and it is the key the panel prints", async () => {
    const answers: AskResponse[] = [];
    const cancelled: number[] = [];
    const screen = await askStage(0, answers, cancelled);
    // The panel prints a Cancel key, so the escape route out of a question is a
    // stated act rather than a closed window, and the app is told either way.
    expect(screen.inkOf("").map((entry) => entry.text)).toContain("Cancel");
    await screen.press("escape");
    expect(answers.length).toBe(0);
    expect(cancelled.length).toBe(1);
  });
});
