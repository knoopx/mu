/**
 * The library as a schema: one `createLibrary` over the definitions in
 * `components/library`, and the reads every tool answers from — the component
 * index, one component's arguments, the root the parser insists on.
 *
 * Nothing here draws. The drawing lives beside the definitions it belongs to,
 * and this file is what the parser, the prompt and `openui-library` agree on.
 */

import { createLibrary } from "@openuidev/lang-core";

import { ROOT_COMPONENT } from "../../constants";
import type {
  OpenUIComponentInfo,
  OpenUIGroupInfo,
  OpenUIPropInfo,
} from "../../types";
import {
  programDefinitions,
  programGroups,
} from "../../components/library/registry";

export const openUILibrary = createLibrary({
  root: ROOT_COMPONENT,
  components: programDefinitions,
  componentGroups: programGroups,
});

/** What the parser and the validator are built from. */
export const librarySchema = openUILibrary.toJSONSchema();

/** What the system prompt is built from. */
export const librarySpec = openUILibrary.toSpec();

const defs = (): Record<string, Record<string, unknown>> =>
  (librarySchema.$defs ?? {}) as Record<string, Record<string, unknown>>;

/** One JSON Schema fragment, said the way a program's argument reads. */
function typeWord(fragment: unknown): string {
  if (typeof fragment !== "object" || fragment === null) return "any";
  const schema = fragment as Record<string, unknown>;

  if (Array.isArray(schema.anyOf)) {
    const parts = (schema.anyOf as unknown[])
      .filter((part) => (part as { type?: unknown }).type !== "null")
      .map(typeWord);
    return parts.length === 0 ? "any" : parts.join(" | ");
  }
  if (Array.isArray(schema.enum))
    return (schema.enum as unknown[])
      .map((value) => JSON.stringify(value))
      .join(" | ");

  if (schema.type === "array") {
    const items = typeWord(schema.items);
    return items === "any" ? "any[]" : `${items}[]`;
  }
  if (schema.type === "object") return "object";
  if (Array.isArray(schema.type))
    return (schema.type as string[]).join(" | ");
  if (typeof schema.type === "string") return schema.type;
  return "any";
}

/** The arguments of one component, in the positional order a program writes them. */
function propsOf(name: string): OpenUIPropInfo[] {
  const def = defs()[name];
  const properties = (def?.properties ?? {}) as Record<string, unknown>;
  const required = (def?.required ?? []) as string[];

  return Object.keys(properties).map((key) => ({
    name: key,
    type: typeWord(properties[key]),
    required: required.includes(key),
  }));
}

const signatureOf = (name: string): string =>
  librarySpec.components[name]?.signature ?? name;

const descriptionOf = (name: string): string =>
  librarySpec.components[name]?.description ?? "";

const groupOf = (name: string): string => {
  for (const group of programGroups)
    if (group.components.includes(name)) return group.name;
  return "Other";
};

/** Every component of the library, in the order the prompt teaches them. */
export function componentIndex(): OpenUIComponentInfo[] {
  return programDefinitions.map((definition) => ({
    name: definition.name,
    group: groupOf(definition.name),
    signature: signatureOf(definition.name),
    description: descriptionOf(definition.name),
    props: propsOf(definition.name),
  }));
}

/** One component, or null when the library has no name by that spelling. */
export function componentInfo(name: string): OpenUIComponentInfo | null {
  const wanted = name.trim();
  if (wanted === "") return null;
  return (
    componentIndex().find(
      (component) => component.name.toLowerCase() === wanted.toLowerCase(),
    ) ?? null
  );
}

/** The library's groups. The `notes` a group carries are empty: see `registry.ts`. */
export function libraryGroups(): OpenUIGroupInfo[] {
  return programGroups;
}

/** How many components the library holds. */
export const componentCount = (): number => programDefinitions.length;

/** The root a program must define. */
export const rootComponent = ROOT_COMPONENT;
