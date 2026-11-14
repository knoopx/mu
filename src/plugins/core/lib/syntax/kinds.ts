import type { DiffTokenKind } from "adwaita-gpuix";

/**
 * Reading a syntax node as a kind of thing.
 *
 * A grammar names its nodes by what they are — `comment`, `string_content`,
 * `type_identifier`, `property_identifier` — and those names agree across the
 * languages far better than any per-language highlight query would have to. So
 * the rule here is a name match, not a query: a node whose name says "string"
 * reads as a string in every grammar that has one.
 *
 * Keywords are the exception. A grammar writes `if`, `const`, `def` and `func`
 * as *anonymous* tokens whose type is the word itself, with nothing in the name
 * to match on, so the word is looked up in a set that is the union of the
 * languages'. A word that is a keyword in one language and an ordinary
 * identifier in another is rare, and reads as a keyword either way.
 */

/** A node whose whole span is one thing, whatever sits inside it. */
const STRONG: [RegExp, DiffTokenKind][] = [
  [/comment/, "comment"],
  [/string|heredoc|char_literal|literal_block/, "string"],
];

/** A leaf node's name, and the kind it says the leaf is. */
const LEAF: [RegExp, DiffTokenKind][] = [
  [/comment/, "comment"],
  [/string|char/, "string"],
  [/number|integer|float|decimal|hex|octal/, "number"],
  [
    /^(true|false|null|none|nil|undefined|boolean_literal|null_literal)$/,
    "constant",
  ],
  [
    /type_identifier|type_name|primitive_type|type_annotation|typedef|type_alias|class_name|interface_name|struct_name|enum_name|union_name|namespace_name|generic_parameter/,
    "type",
  ],
  [/function|method|constructor|callable|macro/, "function"],
  [/property|field_identifier|attribute|accessor|shorthand/, "property"],
  [/constant|upper_case/, "constant"],
];

/** The name of an identifier-ish leaf, whose text decides what it is. */
const NAMED_THING = /identifier|variable|name|expression$/;

/**
 * The words that introduce or control a construct, across the languages this
 * app reads. They match a whole token type, so `for` never colours the letters
 * inside `format`.
 */
export const KEYWORDS = new Set([
  // the words most of them share
  "abstract",
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "defer",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "finally",
  "for",
  "from",
  "function",
  "get",
  "goto",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "of",
  "package",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "set",
  "static",
  "struct",
  "super",
  "switch",
  "this",
  "throw",
  "throws",
  "try",
  "type",
  "typedef",
  "union",
  "using",
  "var",
  "void",
  "volatile",
  "while",
  "yield",
  // c, c++, c#, java
  "auto",
  "bool",
  "char",
  "constexpr",
  "decltype",
  "double",
  "dynamic_cast",
  "event",
  "explicit",
  "extern",
  "final",
  "float",
  "friend",
  "inline",
  "int",
  "internal",
  "long",
  "mutable",
  "namespace",
  "operator",
  "override",
  "register",
  "sealed",
  "short",
  "signed",
  "sizeof",
  "template",
  "this",
  "typeid",
  "typename",
  "unsigned",
  "virtual",
  "wchar_t",
  // javascript, typescript
  "declare",
  "debugger",
  "infer",
  "is",
  "keyof",
  "module",
  "satisfies",
  // python
  "and",
  "assert",
  "def",
  "del",
  "elif",
  "except",
  "global",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "with",
  // rust
  "crate",
  "cratename",
  "dyn",
  "fn",
  "impl",
  "loop",
  "match",
  "mod",
  "move",
  "mut",
  "pub",
  "ref",
  "unsafe",
  "use",
  "where",
  // go
  "chan",
  "fallthrough",
  "func",
  "go",
  "map",
  "range",
  "select",
  // ruby
  "alias",
  "begin",
  "end",
  "ensure",
  "module",
  "redo",
  "rescue",
  "retry",
  "then",
  "unless",
  "until",
  "when",
  // php
  "echo",
  "elseif",
  "endif",
  "endforeach",
  "endswitch",
  "endwhile",
  "foreach",
  "global",
  "include",
  "include_once",
  "isset",
  "list",
  "print",
  "require",
  "require_once",
  "unset",
  // shell, powershell
  "begin",
  "done",
  "elif",
  "esac",
  "exit",
  "fi",
  "filter",
  "foreach",
  "local",
  "param",
  "process",
  "source",
  "then",
  "until",
  "workflow",
]);

/** A span that reads as one thing no matter what sits inside it. */
export function strongKindOf(type: string): DiffTokenKind | null {
  for (const [pattern, kind] of STRONG) if (pattern.test(type)) return kind;
  return null;
}

/**
 * What a leaf reads as.
 *
 * An identifier is decided by its shape and the character after it: a SCREAMING
 * name is a constant, and a name followed by `(` is being called, which is how
 * a call site stands out in a line that is otherwise all plain text.
 */
export function leafKindOf(
  type: string,
  text: string,
  called: boolean,
): DiffTokenKind {
  for (const [pattern, kind] of LEAF) if (pattern.test(type)) return kind;
  if (KEYWORDS.has(type)) return "keyword";
  if (!NAMED_THING.test(type)) return "plain";
  if (/^[A-Z][A-Z0-9_]+$/.test(text)) return "constant";
  if (called) return "function";
  return "plain";
}
