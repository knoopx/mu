/**
 * Where a question's answer is filed.
 *
 * A program asks questions in three shapes: a Form, a run of choice Buttons, or
 * one Button that asks for one thing. Each is named by where it stands in the
 * screen, so the same question re-stages its own answer rather than adding a
 * second copy of it to the message, and an answer already sent can be folded
 * without asking what produced it.
 */

/** A Form: the whole form is one question, whatever it holds inside it. */
export const formPosition = (path: string): string => `form@${path}`;

/** A run of choice Buttons — the buttons beside each other are one question, not several. */
export const choiceRunPosition = (group: string): string => `run@${group}`;


