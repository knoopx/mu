import { defineComponent } from "@openuidev/react-lang";
import { z } from "zod";
import type { StyleDesc } from "@gpuix/react";
import { Card, T, useAdwaita, type AdwaitaTheme } from "adwaita-gpuix";
import { GAP } from "../../lib/tokens";

type Kind = "ord" | "bin" | "rel" | "open" | "close" | "punct" | "op";

interface Run {
  type: "run";
  text: string;
  kind: Kind;
  bold?: boolean;
}
interface Space {
  type: "space";
  em: number;
}
interface Frac {
  type: "frac";
  num: Node[];
  den: Node[];
  rule: boolean;
}
interface Sqrt {
  type: "sqrt";
  index: Node[] | null;
  body: Node[];
}
interface Accent {
  type: "accent";
  mark: string;
  rule: boolean;
  body: Node[];
}
interface Scripted {
  type: "script";
  base: Node;
  sup: Node[] | null;
  sub: Node[] | null;
}
interface Group {
  type: "group";
  body: Node[];
  open?: string;
  close?: string;
}
interface LineBreak {
  type: "break";
}
type Node = Run | Space | Frac | Sqrt | Accent | Scripted | Group | LineBreak;

const GREEK: Record<string, string> = {
  alpha: "α",
  beta: "β",
  gamma: "γ",
  delta: "δ",
  epsilon: "ε",
  varepsilon: "ε",
  zeta: "ζ",
  eta: "η",
  theta: "θ",
  vartheta: "ϑ",
  iota: "ι",
  kappa: "κ",
  lambda: "λ",
  mu: "μ",
  nu: "ν",
  xi: "ξ",
  omicron: "ο",
  pi: "π",
  varpi: "ϖ",
  rho: "ρ",
  varrho: "ϱ",
  sigma: "σ",
  varsigma: "ς",
  tau: "τ",
  upsilon: "υ",
  phi: "φ",
  varphi: "φ",
  chi: "χ",
  psi: "ψ",
  omega: "ω",
  Gamma: "Γ",
  Delta: "Δ",
  Theta: "Θ",
  Lambda: "Λ",
  Xi: "Ξ",
  Pi: "Π",
  Sigma: "Σ",
  Upsilon: "Υ",
  Phi: "Φ",
  Psi: "Ψ",
  Omega: "Ω",
};

const SYMBOLS: Record<string, [string, Kind]> = {
  times: ["×", "bin"],
  div: ["÷", "bin"],
  cdot: ["⋅", "bin"],
  ast: ["∗", "bin"],
  star: ["⋆", "bin"],
  circ: ["∘", "bin"],
  bullet: ["∙", "bin"],
  oplus: ["⊕", "bin"],
  ominus: ["⊖", "bin"],
  otimes: ["⊗", "bin"],
  cap: ["∩", "bin"],
  cup: ["∪", "bin"],
  setminus: ["∖", "bin"],
  wedge: ["∧", "bin"],
  vee: ["∨", "bin"],
  land: ["∧", "bin"],
  lor: ["∨", "bin"],
  pm: ["±", "bin"],
  mp: ["∓", "bin"],
  le: ["≤", "rel"],
  leq: ["≤", "rel"],
  ge: ["≥", "rel"],
  geq: ["≥", "rel"],
  ne: ["≠", "rel"],
  neq: ["≠", "rel"],
  approx: ["≈", "rel"],
  equiv: ["≡", "rel"],
  sim: ["∼", "rel"],
  simeq: ["≃", "rel"],
  cong: ["≅", "rel"],
  propto: ["∝", "rel"],
  to: ["→", "rel"],
  rightarrow: ["→", "rel"],
  Rightarrow: ["⇒", "rel"],
  gets: ["←", "rel"],
  leftarrow: ["←", "rel"],
  Leftarrow: ["⇐", "rel"],
  Leftrightarrow: ["⇔", "rel"],
  mapsto: ["↦", "rel"],
  implies: ["⟹", "rel"],
  iff: ["⟺", "rel"],
  in: ["∈", "rel"],
  notin: ["∉", "rel"],
  ni: ["∋", "rel"],
  subset: ["⊂", "rel"],
  subseteq: ["⊆", "rel"],
  supset: ["⊃", "rel"],
  supseteq: ["⊇", "rel"],
  forall: ["∀", "rel"],
  exists: ["∃", "rel"],
  perp: ["⊥", "rel"],
  parallel: ["∥", "rel"],
  mid: ["∣", "rel"],
  neg: ["¬", "ord"],
  nabla: ["∇", "ord"],
  partial: ["∂", "ord"],
  infty: ["∞", "ord"],
  angle: ["∠", "ord"],
  hbar: ["ℏ", "ord"],
  ell: ["ℓ", "ord"],
  aleph: ["ℵ", "ord"],
  emptyset: ["∅", "ord"],
  varnothing: ["∅", "ord"],
  surd: ["√", "ord"],
  degree: ["°", "ord"],
  prime: ["′", "ord"],
  dagger: ["†", "ord"],
  checkmark: ["✓", "ord"],
  triangle: ["△", "ord"],
  square: ["□", "ord"],
  langle: ["⟨", "open"],
  rangle: ["⟩", "close"],
  lfloor: ["⌊", "open"],
  rfloor: ["⌋", "close"],
  lceil: ["⌈", "open"],
  rceil: ["⌉", "close"],
  lvert: ["|", "open"],
  rvert: ["|", "close"],
  vert: ["|", "ord"],
  Vert: ["‖", "ord"],
  ldots: ["…", "punct"],
  cdots: ["⋯", "punct"],
  dots: ["…", "punct"],
  vdots: ["⋮", "ord"],
  ddots: ["⋱", "ord"],
};

const BIG_OPS: Record<string, string> = {
  sum: "∑",
  prod: "∏",
  int: "∫",
  iint: "∬",
  oint: "∮",
  bigcup: "⋃",
  bigcap: "⋂",
  bigoplus: "⨁",
  bigotimes: "⨂",
  lim: "lim",
};

const FUNCTIONS = new Set([
  "sin",
  "cos",
  "tan",
  "cot",
  "sec",
  "csc",
  "arcsin",
  "arccos",
  "arctan",
  "sinh",
  "cosh",
  "tanh",
  "log",
  "ln",
  "lg",
  "exp",
  "max",
  "min",
  "limsup",
  "liminf",
  "det",
  "dim",
  "ker",
  "gcd",
  "arg",
  "deg",
  "mod",
]);

const SPACES: Record<string, number> = {
  ",": 0.17,
  ":": 0.22,
  ";": 0.28,
  "!": -0.07,
  " ": 0.33,
  quad: 1,
  qquad: 2,
};

const ACCENTS: Record<string, [string, boolean]> = {
  hat: ["^", false],
  widehat: ["^", false],
  check: ["ˇ", false],
  tilde: ["~", false],
  widetilde: ["~", false],
  dot: ["˙", false],
  ddot: ["¨", false],
  vec: ["→", false],
  overrightarrow: ["→", false],
  bar: ["", true],
  overline: ["", true],
};

const SKIPS = new Set([
  "left",
  "right",
  "middle",
  "big",
  "Big",
  "bigg",
  "Bigg",
  "bigl",
  "bigr",
  "Bigl",
  "Bigr",
  "biggl",
  "biggr",
  "displaystyle",
  "textstyle",
  "limits",
  "nolimits",
  "centering",
  "label",
]);

const CHARS: Record<string, [string, Kind]> = {
  "+": ["+", "bin"],
  "-": ["−", "bin"],
  "*": ["∗", "bin"],
  "/": ["/", "ord"],
  "=": ["=", "rel"],
  "<": ["<", "rel"],
  ">": [">", "rel"],
  ":": [":", "rel"],
  "(": ["(", "open"],
  ")": [")", "close"],
  "[": ["[", "open"],
  "]": ["]", "close"],
  "|": ["|", "ord"],
  ",": [",", "punct"],
  ";": [";", "punct"],
  ".": [".", "ord"],
  "!": ["!", "ord"],
  "'": ["′", "ord"],
  "?": ["?", "punct"],
};

const TEXT_ESCAPES: Record<string, string> = {
  "\\": "\\",
  "{": "{",
  "}": "}",
  "%": "%",
  "$": "$",
  "&": "&",
  "#": "#",
  _: "_",
  "^": "^",
  " ": " ",
};

interface Parser {
  src: string;
  i: number;
  stopped: boolean;
}

function isLetter(c: string | undefined): boolean {
  return !!c && /[A-Za-z]/.test(c);
}

function isWordy(c: string | undefined): boolean {
  return !!c && /[A-Za-z0-9.]/.test(c);
}

function skipSpace(p: Parser): void {
  while (p.i < p.src.length && p.src[p.i] === " ") p.i++;
}

function takeArg(p: Parser): Node[] {
  skipSpace(p);
  if (p.i >= p.src.length) return [];
  const node = atom(p);
  if (!node) return [];
  return node.type === "group" ? node.body : [node];
}

function takeRawArg(p: Parser): string {
  skipSpace(p);
  if (p.src[p.i] !== "{") {
    const ch = p.src[p.i];
    p.i++;
    return ch ?? "";
  }
  p.i++;
  let depth = 1;
  let out = "";
  while (p.i < p.src.length) {
    const c = p.src[p.i]!;
    if (c === "}") {
      depth--;
      if (depth === 0) {
        p.i++;
        break;
      }
      out += c;
      continue;
    }
    if (c === "{") depth++;
    if (c === "\\" && TEXT_ESCAPES[p.src[p.i + 1] ?? ""] !== undefined) {
      out += TEXT_ESCAPES[p.src[p.i + 1]!];
      p.i += 2;
      continue;
    }
    out += c;
    p.i++;
  }
  return out;
}

function takeOptionalArg(p: Parser): Node[] | null {
  skipSpace(p);
  if (p.src[p.i] !== "[") return null;
  p.i++;
  const body: Node[] = [];
  while (p.i < p.src.length && p.src[p.i] !== "]") {
    const node = atom(p);
    if (p.stopped) break;
    if (node) body.push(node);
    else if (p.i < p.src.length && p.src[p.i] !== "]") p.i++;
  }
  if (p.src[p.i] === "]") p.i++;
  return body;
}

function takeScripts(p: Parser, base: Node): Node {
  let sup: Node[] | null = null;
  let sub: Node[] | null = null;
  for (;;) {
    const c = p.src[p.i];
    if (c === "^") {
      p.i++;
      sup = takeArg(p);
    } else if (c === "_") {
      p.i++;
      sub = takeArg(p);
    } else break;
  }
  if (!sup && !sub) return base;
  return { type: "script", base, sup, sub };
}

function run(text: string, kind: Kind, bold?: boolean): Run {
  return { type: "run", text, kind, ...(bold ? { bold: true } : {}) };
}

function environmentDelims(name: string): [string, string] | null {
  if (name === "pmatrix" || name === "vmatrix") return ["(", ")"];
  if (name === "bmatrix") return ["[", "]"];
  if (name === "Bmatrix") return ["‖", "‖"];
  if (name === "cases") return ["{", ""];
  if (name === "matrix" || name === "array" || name === "aligned" || name === "align")
    return ["", ""];
  return null;
}

function takeEnvironmentName(p: Parser): string {
  skipSpace(p);
  return takeRawArg(p).trim();
}

function parseEnvironment(p: Parser, startName: string): Node {
  const body: Node[] = [];
  while (p.i < p.src.length) {
    const node = atom(p);
    if (p.stopped) {
      p.stopped = false;
      break;
    }
    if (node) body.push(node);
    else if (p.i < p.src.length) p.i++;
  }
  const delims = environmentDelims(startName);
  return {
    type: "group",
    body,
    ...(delims ? { open: delims[0], close: delims[1] } : {}),
  };
}

function command(p: Parser): Node | null {
  p.i++;
  const head = p.src[p.i];
  if (head === undefined) return run("\\", "ord");
  if (!isLetter(head)) {
    p.i++;
    if (SPACES[head] !== undefined) return { type: "space", em: SPACES[head]! };
    if (head === "\\") return { type: "break" };
    if (TEXT_ESCAPES[head] !== undefined) return run(TEXT_ESCAPES[head]!, "ord");
    return run(`\\${head}`, "ord");
  }
  let j = p.i;
  while (j < p.src.length && isLetter(p.src[j])) j++;
  const name = p.src.slice(p.i, j);
  p.i = j;

  if (name === "end") {
    takeEnvironmentName(p);
    p.stopped = true;
    return null;
  }
  if (name === "begin") {
    const env = takeEnvironmentName(p);
    return parseEnvironment(p, env);
  }
  if (name === "frac" || name === "dfrac" || name === "tfrac" || name === "cfrac") {
    return { type: "frac", num: takeArg(p), den: takeArg(p), rule: true };
  }
  if (name === "binom" || name === "dbinom" || name === "tbinom") {
    const inner: Node = { type: "frac", num: takeArg(p), den: takeArg(p), rule: false };
    return { type: "group", body: [inner], open: "(", close: ")" };
  }
  if (name === "sqrt") {
    const index = takeOptionalArg(p);
    return { type: "sqrt", index, body: takeArg(p) };
  }
  if (ACCENTS[name]) {
    const [mark, rule] = ACCENTS[name]!;
    return { type: "accent", mark, rule, body: takeArg(p) };
  }
  if (name === "text" || name === "mbox" || name === "textbf" || name === "textrm") {
    return run(takeRawArg(p), "ord", name === "textbf");
  }
  if (name === "mathbf" || name === "boldsymbol" || name === "bm") {
    return { type: "group", body: bolden(takeArg(p)) };
  }
  if (name === "mathrm" || name === "mathbb" || name === "mathcal" || name === "mathsf") {
    return { type: "group", body: takeArg(p) };
  }
  if (name === "operatorname") {
    return run(takeRawArg(p), "ord");
  }
  if (SKIPS.has(name)) return null;
  if (SPACES[name] !== undefined) return { type: "space", em: SPACES[name]! };
  if (BIG_OPS[name]) return run(BIG_OPS[name]!, name === "lim" ? "ord" : "op");
  if (FUNCTIONS.has(name)) return run(name, "ord");
  if (GREEK[name]) return run(GREEK[name]!, "ord");
  if (SYMBOLS[name]) {
    const [text, kind] = SYMBOLS[name]!;
    return run(text, kind);
  }

  return run(`\\${name}`, "ord");
}

function bolden(nodes: Node[]): Node[] {
  return nodes.map((node) =>
    node.type === "run" ? { ...node, bold: true } : node,
  );
}

function atom(p: Parser): Node | null {
  const c = p.src[p.i];
  if (c === undefined) return null;
  if (c === "}") return null;
  if (c === "{") {
    p.i++;
    const body: Node[] = [];
    while (p.i < p.src.length) {
      if (p.stopped) break;
      const node = atom(p);
      if (node) body.push(node);
      else if (p.src[p.i] === "}") break;
      else if (p.src[p.i] !== undefined && !p.stopped) p.i++;
    }
    if (p.src[p.i] === "}") p.i++;
    return takeScripts(p, { type: "group", body });
  }
  if (c === "\\") {
    const node = command(p);
    return node ? takeScripts(p, node) : null;
  }
  if (c === "&") {
    p.i++;
    return { type: "space", em: 1.2 };
  }
  if (c === "~") {
    p.i++;
    return { type: "space", em: 0.33 };
  }
  if (c === " ") {
    p.i++;
    return null;
  }
  if (isWordy(c)) {
    let j = p.i;
    while (isWordy(p.src[j])) j++;
    const text = p.src.slice(p.i, j);
    p.i = j;
    return takeScripts(p, run(text, "ord"));
  }
  const known = CHARS[c];
  p.i++;
  if (known) return takeScripts(p, run(known[0], known[1]));
  if (c === "]") return takeScripts(p, run("]", "close"));
  return takeScripts(p, run(c, "ord"));
}

function parseList(p: Parser): Node[] {
  const out: Node[] = [];
  while (p.i < p.src.length) {
    if (p.stopped) break;
    const c = p.src[p.i]!;
    if (c === "}") {
      p.i++;
      out.push(run("}", "close"));
      continue;
    }
    const node = atom(p);
    if (node) out.push(node);
    else if (p.src[p.i] === c) p.i++;
  }
  return out;
}

function parseTex(tex: string): Node[] {
  const src = tex ?? "";
  const p: Parser = { src, i: 0, stopped: false };
  try {
    return parseList(p);
  } catch {
    return [run(src, "ord")];
  }
}

function lineFor(size: number): number {
  return Math.round(size * 1.25);
}

function ruleFor(size: number): number {
  return Math.max(1, Math.round(size * 0.07));
}

function MathRun({ run: r, size, t }: { run: Run; size: number; t: AdwaitaTheme }) {
  const fontSize = r.kind === "op" ? Math.round(size * 1.26) : size;
  const side = r.kind === "bin" || r.kind === "rel" ? Math.round(size * 0.16) : 0;
  const trailing = r.kind === "punct" ? Math.round(size * 0.14) : 0;
  const style: StyleDesc = {
    fontSize,
    lineHeight: lineFor(fontSize),
    whiteSpace: "nowrap",
    ...(r.bold ? { fontWeight: 700 } : {}),
    ...(side ? { marginLeft: side, marginRight: side } : {}),
    ...(trailing && !side ? { marginRight: trailing } : {}),
  };
  return (
    <T size="body" color={t.color.text.primary} style={style}>
      {r.text}
    </T>
  );
}

function MathStack({
  top,
  rule,
  bottom,
  size,
  t,
}: {
  top?: Node[];
  rule: boolean;
  bottom: Node[];
  size: number;
  t: AdwaitaTheme;
}) {
  const gap = Math.max(1, Math.round(size * 0.1));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap,
      }}
    >
      {top ? (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <MathRow nodes={top} size={size} t={t} />
        </div>
      ) : null}
      {rule ? (
        <div style={{ height: ruleFor(size), backgroundColor: t.color.text.primary }} />
      ) : null}
      <div style={{ display: "flex", justifyContent: "center" }}>
        <MathRow nodes={bottom} size={size} t={t} />
      </div>
    </div>
  );
}

function MathScripted({
  node,
  size,
  t,
}: {
  node: Scripted;
  size: number;
  t: AdwaitaTheme;
}) {
  const script = Math.max(9, Math.round(size * 0.7));
  const both = node.sup !== null && node.sub !== null;
  const drop = Math.round(size * (both ? 0.18 : 0.34));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        gap: Math.max(1, Math.round(size * 0.04)),
      }}
    >
      <MathItem node={node.base} size={size} t={t} />
      {node.sup || node.sub ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 0,
          }}
        >
          {node.sup ? <MathRow nodes={node.sup} size={script} t={t} /> : null}
          {node.sub ? (
            <div style={{ display: "flex", marginTop: drop }}>
              <MathRow nodes={node.sub} size={script} t={t} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MathSqrt({ node, size, t }: { node: Sqrt; size: number; t: AdwaitaTheme }) {
  const script = Math.max(9, Math.round(size * 0.62));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-end",
        gap: 1,
      }}
    >
      {node.index ? (
        <div style={{ alignSelf: "flex-start", marginLeft: Math.round(size * 0.1) }}>
          <MathRow nodes={node.index} size={script} t={t} />
        </div>
      ) : null}
      <MathRun run={run("√", "ord")} size={size} t={t} />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          gap: Math.max(1, Math.round(size * 0.08)),
        }}
      >
        <div style={{ height: ruleFor(size), backgroundColor: t.color.text.primary }} />
        <MathRow nodes={node.body} size={size} t={t} />
      </div>
    </div>
  );
}

function MathAccent({ node, size, t }: { node: Accent; size: number; t: AdwaitaTheme }) {
  const markSize = Math.max(9, Math.round(size * 0.8));
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 1,
      }}
    >
      {node.rule ? (
        <div style={{ height: ruleFor(size), backgroundColor: t.color.text.primary }} />
      ) : (
        <div style={{ display: "flex", justifyContent: "center" }}>
          <MathRun run={run(node.mark, "ord")} size={markSize} t={t} />
        </div>
      )}
      <MathRow nodes={node.body} size={size} t={t} />
    </div>
  );
}

function MathItem({ node, size, t }: { node: Node; size: number; t: AdwaitaTheme }) {
  switch (node.type) {
    case "run":
      return <MathRun run={node} size={size} t={t} />;
    case "space": {
      const width = Math.round(node.em * size);
      if (width === 0) return null;
      return (
        <div
          style={{
            width: Math.max(0, width),
            ...(width < 0 ? { marginLeft: width } : {}),
          }}
        />
      );
    }
    case "frac":
      return (
        <MathStack
          top={node.num}
          rule={node.rule}
          bottom={node.den}
          size={Math.max(10, Math.round(size * 0.92))}
          t={t}
        />
      );
    case "sqrt":
      return <MathSqrt node={node} size={size} t={t} />;
    case "accent":
      return <MathAccent node={node} size={size} t={t} />;
    case "script":
      return <MathScripted node={node} size={size} t={t} />;
    case "group": {
      const inner = (
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 0,
          }}
        >
          {node.open ? <MathRun run={run(node.open, "open")} size={size} t={t} /> : null}
          <MathRow nodes={node.body} size={size} t={t} />
          {node.close ? <MathRun run={run(node.close, "close")} size={size} t={t} /> : null}
        </div>
      );
      return node.open || node.close ? inner : <MathRow nodes={node.body} size={size} t={t} />;
    }
    case "break":
      return null;
  }
}

function MathRow({
  nodes,
  size,
  t,
}: {
  nodes: Node[];
  size: number;
  t: AdwaitaTheme;
}) {
  const rows: Node[][] = [[]];
  for (const node of nodes) {
    if (node.type === "break") rows.push([]);
    else rows[rows.length - 1]!.push(node);
  }
  const lines = rows.filter((row) => row.length > 0);
  if (lines.length === 0) return null;
  if (lines.length === 1) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 0,
        }}
      >
        {lines[0]!.map((node, i) => (
          <MathItem key={i} node={node} size={size} t={t} />
        ))}
      </div>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: GAP.s,
      }}
    >
      {lines.map((row, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 0,
          }}
        >
          {row.map((node, j) => (
            <MathItem key={j} node={node} size={size} t={t} />
          ))}
        </div>
      ))}
    </div>
  );
}

function groupText(nodes: Node[]): string {
  const flat = flatten(nodes);
  return nodes.length === 1 && flat.length <= 1 ? flat : `(${flat})`;
}

function flatten(nodes: Node[]): string {
  const parts: string[] = [];
  for (const node of nodes) {
    switch (node.type) {
      case "run":
        parts.push(node.text);
        break;
      case "space":
        parts.push(node.em >= 0.9 ? "  " : node.em > 0 ? " " : "");
        break;
      case "frac":
        parts.push(`${groupText(node.num)}/${groupText(node.den)}`);
        break;
      case "sqrt":
        parts.push(
          `${node.index ? `√[${flatten(node.index)}]` : "√"}${groupText(node.body)}`,
        );
        break;
      case "accent":
        parts.push(node.rule ? `¯${groupText(node.body)}` : `${node.mark}${groupText(node.body)}`);
        break;
      case "script": {
        const base = MathItemText(node.base);
        if (node.sup) parts.push(`${base}^${groupText(node.sup)}`);
        if (node.sub) parts.push(`${base}_${groupText(node.sub)}`);
        break;
      }
      case "group":
        if (node.open) parts.push(node.open);
        parts.push(flatten(node.body));
        if (node.close) parts.push(node.close);
        break;
      case "break":
        parts.push(" ");
        break;
    }
  }
  return parts.join("");
}

function MathItemText(node: Node): string {
  if (node.type === "run") return node.text;
  if (node.type === "group") return flatten(node.body);
  return flatten([node]);
}

export const MathBlock = defineComponent({
  name: "Math",
  props: z.object({
    tex: z
      .string()
      .describe(
        "TeX formula. Supported: greek (\\alpha..\\omega, \\Gamma..\\Omega), operators (\\times \\cdot \\div \\pm \\le \\ge \\neq \\approx \\to \\in \\sum \\int \\prod \\infty \\pi), \\frac{a}{b}, \\binom, \\sqrt[n]{x}, x^{2} x_{i}, \\text{..} \\mathbf{..} \\bar{..} \\hat{..} \\vec{..}, function names, \\\\ for a new line, and \\begin{pmatrix}/\\begin{cases}. Anything else prints verbatim.",
      ),
    inline: z
      .boolean()
      .optional()
      .describe(
        "true to draw one text run beside other text (fractions become a/b, scripts become ^ and _); default false draws a centred block on its own surface.",
      ),
  }),
  description:
    "A formula drawn from adwaita text: unicode symbols, stacked fractions with a rule, radicals, raised and dropped scripts. No KaTeX, so it is a TeX subset — an unknown macro shows up as its own name.",
  component: ({ props }) => {
    const t = useAdwaita();
    const nodes = parseTex(props.tex);
    if (props.inline) {
      return (
        <T
          size="body"
          color={t.color.text.primary}
          style={{ whiteSpace: "nowrap", lineHeight: lineFor(t.type.body) }}
        >
          {flatten(nodes)}
        </T>
      );
    }
    return (
      <Card
        style={{
          width: "100%",
          alignItems: "center",
          justifyContent: "center",
          gap: GAP.s,
          padding: t.space.sm,
        }}
      >
        <MathRow nodes={nodes} size={Math.round(t.type.body * 1.3)} t={t} />
      </Card>
    );
  },
});

