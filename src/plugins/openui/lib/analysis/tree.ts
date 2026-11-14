/**
 * Walking an evaluated tree the way the renderer walks it.
 *
 * A question a program asks — a Form, a run of choice Buttons — is named by
 * where it stands in the tree, because that is the only identity a drawn element
 * has: the same path is what stages its answer, what re-stages it when a field
 * changes, and what folds it once the answer has gone out. So the path is
 * written down once, here, and both the renderer and the reads that follow a
 * painted screen build it the same way: a step is the element's statement when it
 * has one, and its place among its siblings.
 */

import type { ElementNode } from "@openuidev/lang-core";

/** One step down the tree. */
export function segmentOf(value: unknown, index: number): string {
  const statement = (value as { statementId?: unknown } | null)?.statementId;
  return typeof statement === "string" && statement !== ""
    ? `${statement}#${String(index)}`
    : `#${String(index)}`;
}

/** The path of one child of `path`. */
export function childPath(path: string, value: unknown, index: number): string {
  const segment = segmentOf(value, index);
  return path === "" ? segment : `${path}/${segment}`;
}

const isElement = (value: unknown): value is ElementNode =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as ElementNode).typeName === "string";

/** A node of a painted screen, and where it stands. */
export interface TreePlace {
  path: string;
  node: ElementNode;
}

/**
 * Every element of the tree that names `typeName`, in document order.
 *
 * The descent mirrors the renderer's: an array prop is a list of children, each
 * standing one step down at its index. A program that puts one element where the
 * library declares a list draws it as one child, and it is found here the same
 * way.
 */
function nodesNamed(root: unknown, typeName: string): TreePlace[] {
  const found: TreePlace[] = [];
  const walk = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((entry, index) =>
        walk(entry, childPath(path, entry, index)),
      );
      return;
    }
    if (!isElement(value)) return;
    if (value.typeName === typeName) found.push({ path, node: value });
    for (const prop of Object.values(
      (value.props ?? {}) as Record<string, unknown>,
    )) {
      if (Array.isArray(prop))
        prop.forEach((entry, index) =>
          walk(entry, childPath(path, entry, index)),
        );
    }
  };
  walk(root, "");
  return found;
}

/** Every `Form` of a painted screen, in document order. */
export const formsOf = (root: unknown): TreePlace[] => nodesNamed(root, "Form");
