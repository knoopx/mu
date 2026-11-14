/**
 * A change-stack write in the log: what the header says, and what the card holds.
 *
 * `vcs-describe` answers with one thing — the description the change now carries.
 * A header is one clipped line, so a message cannot live there: the subject is cut
 * and the body never arrives at all. The claims below are that the message is read
 * in the card, in full, stated once, and that the header keeps the ids.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { releaseAll } from "../harness";
import { INSET, logRow } from "../stage/log";
import {
  DESCRIBE_BODY,
  DESCRIBE_SUBJECT,
  VCS_DESCRIBE_EMPTY_ITEM,
  VCS_DESCRIBE_FAILED_ITEM,
  VCS_DESCRIBE_ITEM,
  VCS_DESCRIBE_REWRITTEN_ITEM,
} from "../fixtures/vcs";

afterEach(releaseAll);

const CHANGED = "msrwzmxunmvy";
const COMMIT = "8c1f4ba20d7e";

describe("the description a describe wrote", () => {
  test("the card holds the whole message: subject and body, each on its line", async () => {
    const screen = await logRow(VCS_DESCRIBE_ITEM);
    expect(screen.says(DESCRIBE_SUBJECT)).toBe(true);
    for (const line of DESCRIBE_BODY) expect(screen.says(line)).toBe(true);
  });

  test("the message stands in the card, under the header and in one column", async () => {
    const screen = await logRow(VCS_DESCRIBE_ITEM);
    const header = screen.ink("vcs-describe");
    const subject = screen.ink(DESCRIBE_SUBJECT);
    const body = screen.ink(DESCRIBE_BODY[0]);
    // The card is the plate under the head, and its ink stands inside it: every
    // line of the message starts at the same x, and that x is the card's, not the
    // header's text column.
    expect(subject.y).toBeGreaterThan(header.y);
    expect(subject.x).toBeGreaterThan(INSET);
    expect(body.x).toBe(subject.x);
    // A body line sits under the subject it belongs to, not beside it.
    expect(body.y).toBeGreaterThan(subject.y);
  });

  test("the message is stated once — the header no longer carries it", async () => {
    const screen = await logRow(VCS_DESCRIBE_ITEM);
    expect(screen.mentions(DESCRIBE_SUBJECT)).toBe(1);
    const headerLine = screen.ink(CHANGED);
    expect(headerLine.text).not.toContain(DESCRIBE_SUBJECT);
    // What the header keeps is which revision the write landed on, and the commit
    // that change ends on.
    expect(screen.says(CHANGED)).toBe(true);
    expect(screen.says(COMMIT)).toBe(true);
  });

  test("a working copy that took a new change id says which one it was", async () => {
    const screen = await logRow(VCS_DESCRIBE_REWRITTEN_ITEM);
    expect(screen.says("qkpwunvmsrzt")).toBe(true);
    expect(screen.says("was")).toBe(true);
    // The old id is a row, so it hangs under the message rather than beside it.
    const moved = screen.ink(CHANGED);
    expect(moved.y).toBeGreaterThan(screen.ink(DESCRIBE_SUBJECT).y);
    // The message is still the answer, and it is still said once.
    expect(screen.mentions(DESCRIBE_SUBJECT)).toBe(1);
  });

  test("a describe that landed no description says so, and draws no empty card of its own", async () => {
    const screen = await logRow(VCS_DESCRIBE_EMPTY_ITEM);
    expect(screen.says("(no description)")).toBe(true);
    // Nothing else was written, so nothing else is painted.
    expect(screen.says(DESCRIBE_SUBJECT)).toBe(false);
  });

  test("a describe that never reached its revision says why, and still names it", async () => {
    const screen = await logRow(VCS_DESCRIBE_FAILED_ITEM);
    const header = screen.ink("vcs-describe");
    const reason = screen.ink("cannot resolve revision zzzzzzzz in");
    expect(reason.y).toBeGreaterThan(header.y);
    // The header's own line still names the revision the call was pointed at.
    const named = screen
      .words()
      .filter((word) => word.includes("zzzzzzzz") && !word.includes("cannot"));
    expect(named.length).toBe(1);
    // A failed call leaves no description behind, so no message is painted.
    expect(screen.says(DESCRIBE_SUBJECT)).toBe(false);
  });
});
