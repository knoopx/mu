/**
 * Reading a component's schema as rows.
 *
 * The parser validates a program against a JSON Schema built from the library,
 * and an agent fixes a rejected call by reading that schema. `openui-library`
 * prints the schema itself, and the log paints the same information as one row
 * per prop — name, the type it takes, whether it is required — so the human
 * sees the signature without reading a JSON blob.
 */

import type { OpenuiPropRow } from "../types";

type Schema = Record<string, unknown>;

const asSchema = (value: unknown): Schema | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Schema)
    : null;

const listOfSchemas = (schema: Schema, key: string): Schema[] => {
  const value = schema[key];
  return Array.isArray(value)
    ? value.flatMap((entry) => {
        const nested = asSchema(entry);
        return nested === null ? [] : [nested];
      })
    : [];
};

/** The component a `$ref` points at, named the way a program writes it. */
const refName = (ref: unknown): string =>
  typeof ref === "string" ? (ref.split("/").pop() ?? "") : "";

/** The types one property accepts, in the shortest form worth reading. */
function typeNames(schema: Schema): string[] {
  const ref = refName(schema["$ref"]);
  if (ref !== "") return [ref];

  if (Array.isArray(schema["enum"]))
    return [
      schema["enum"]
        .map((value) => (typeof value === "string" ? `"${value}"` : String(value)))
        .join("|"),
    ];

  if (typeof schema["const"] === "string") return [`"${schema["const"]}"`];

  const union = [...listOfSchemas(schema, "anyOf"), ...listOfSchemas(schema, "oneOf")];
  if (union.length > 0) {
    const names = union.flatMap((entry) => typeNames(entry));
    return names.length === 0 ? [] : [[...new Set(names)].join("|")];
  }

  if (schema["type"] === "array") {
    const items = asSchema(schema["items"]);
    return items === null ? ["array"] : typeNames(items).map((name) => `${name}[]`);
  }

  if (Array.isArray(schema["type"]))
    return [schema["type"].map((entry) => String(entry)).join("|")];

  if (typeof schema["type"] === "string") return [schema["type"]];

  return schema["additionalProperties"] === false ? ["object"] : [];
}

export const propType = (schema: Schema | null): string =>
  schema === null ? "" : typeNames(schema).join(" | ");

/** Every prop of one component definition, required ones first. */
export function readProps(definition: unknown): OpenuiPropRow[] {
  const schema = asSchema(definition);
  const properties = asSchema(schema?.["properties"]);
  if (properties === null) return [];

  const required = new Set(
    Array.isArray(schema?.["required"])
      ? schema["required"].map((entry) => String(entry))
      : [],
  );

  return Object.entries(properties)
    .map(([name, value]) => {
      const prop = asSchema(value);
      return {
        name,
        type: propType(prop),
        required: required.has(name),
        description:
          typeof prop?.["description"] === "string" ? prop["description"] : "",
      };
    })
    .sort((a, b) =>
      a.required === b.required ? a.name.localeCompare(b.name) : a.required ? -1 : 1,
    );
}

/** The schema as the model reads it: printed, not summarised. */
export const schemaText = (definition: unknown): string => {
  try {
    return JSON.stringify(definition ?? {}, null, 2);
  } catch {
    return "{}";
  }
};
