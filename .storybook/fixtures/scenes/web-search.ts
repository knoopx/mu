import { SEARCH_TOOL_NAME } from "../../../src/plugins/web-search/constants";
import { resultsText } from "../../../src/plugins/web-search/lib/duckduckgo/text";
import type {
  WebSearchDetails,
  WebSearchResult,
} from "../../../src/plugins/web-search/types";
import type { TranscriptItem } from "../../../src/plugins/core/lib/agent/transcriptState";
import { answer, at, ran, usage, userTurn } from "../turn";
import { toolCallFixture, type ToolFixture } from "../tool";

const WASM_QUERY =
  "web-tree-sitter dylink.0 custom section tree-sitter-wasm grammar refused";

const host = (url: string): string => {
  const h = new URL(url).hostname.toLowerCase();
  return h.startsWith("www.") ? h.slice(4) : h;
};

const ROWS: Omit<WebSearchResult, "rank" | "host">[] = [
  {
    title: "tree-sitter-wasm: loading grammars in a browser",
    url: "https://tree-sitter.github.io/web-tree-sitter/",
    snippet:
      "Each grammar .wasm must be built with the same tree-sitter runtime version, and Parser.init takes the runtime wasm bytes",
  },
  {
    title: "Why is my grammar rejected with `Invalid wasm file`?",
    url: "https://github.com/tree-sitter/tree-sitter/discussions/2499",
    snippet:
      "A grammar without the dylink.0 custom section cannot be loaded by web-tree-sitter 0.20 and later; the prebuilt aggregate is the usual culprit",
  },
  {
    title: "dylink section missing after wasm-opt",
    url: "https://github.com/WebAssembly/dynamic-linking/issues/22",
    snippet:
      "wasm-opt --strip-target-features drops the dylink section; pass --enable-linking or keep the section",
  },
  {
    title: "web-tree-sitter 0.25 release notes",
    url: "https://github.com/tree-sitter/tree-sitter/releases/tag/web-tree-sitter%400.25.1",
    snippet:
      "Grammars built against an older ABI now fail loudly at load rather than at query time, which is the behaviour most callers want",
  },
  {
    title: "Loading a wasm binary out of a single-file executable",
    url: "https://bun.sh/docs/bundler/embedded",
    snippet:
      "A compiled binary can embed an asset and hand it to the loader as bytes; filesystem resolution is not the only path",
  },
  {
    title: "tree-sitter-wasms package contents",
    url: "https://www.npmjs.com/package/@vscode/tree-sitter-wasm",
    snippet:
      "Sixteen grammars, each with its own .wasm built from the grammar's own repo, plus the shared runtime",
  },
  {
    title: "Parser.init and wasmBinary in a Node worker",
    url: "https://github.com/tree-sitter/tree-sitter/issues/3140",
    snippet:
      "Inside a worker the resolver has no cwd, so pass the bytes explicitly instead of relying on locateFile",
  },
  {
    title: "Query predicates: when #match? is ignored",
    url: "https://tree-sitter.github.io/tree-sitter/using-playgrounds#query-tests",
    snippet:
      "A predicate on a capture that the query engine does not bind is silently dropped; whole-node tests belong in host code",
  },
];

export const WASM_SEARCH_RESULTS: WebSearchResult[] = ROWS.map((row, i) => ({
  rank: i + 1,
  host: host(row.url),
  ...row,
}));

export const WASM_SEARCH_DETAILS: WebSearchDetails = {
  status: "ok",
  query: WASM_QUERY,
  results: WASM_SEARCH_RESULTS,
  count: WASM_SEARCH_RESULTS.length,
  elapsedMs: 2_410,
};

export const WASM_SEARCH_ITEM: ToolFixture = toolCallFixture(
  "call-search-wasm",
  SEARCH_TOOL_NAME,
  { query: WASM_QUERY },
  "ok",
  resultsText(WASM_QUERY, WASM_SEARCH_RESULTS),
  { details: WASM_SEARCH_DETAILS },
);

const RUNTIME_QUERY = "web-tree-sitter Parser.init wasmBinary embed compiled binary";

export const RUNTIME_SEARCH_ITEM: ToolFixture = toolCallFixture(
  "call-search-runtime",
  SEARCH_TOOL_NAME,
  { query: RUNTIME_QUERY, limit: 4 },
  "ok",
  resultsText(RUNTIME_QUERY, WASM_SEARCH_RESULTS.slice(4, 8)),
  {
    details: {
      status: "ok",
      query: RUNTIME_QUERY,
      results: WASM_SEARCH_RESULTS.slice(4, 8),
      count: 4,
      elapsedMs: 1_130,
    },
  },
);

const NOTHING_QUERY = "gpuix react tree-sitter syntax highlight diff rows";

export const EMPTY_SEARCH_ITEM: ToolFixture = toolCallFixture(
  "call-search-nothing",
  SEARCH_TOOL_NAME,
  { query: NOTHING_QUERY },
  "ok",
  resultsText(NOTHING_QUERY, []),
  {
    details: {
      status: "no-results",
      query: NOTHING_QUERY,
      results: [],
      count: 0,
      elapsedMs: 980,
    },
  },
);

const DEAD_QUERY = "wgpu readback test-support linux gpuix";

export const FAILED_SEARCH_ITEM: ToolFixture = toolCallFixture(
  "call-search-dead",
  SEARCH_TOOL_NAME,
  { query: DEAD_QUERY },
  "error",
  "Web search failed: page load timed out after 30s",
);

export const SEARCH_WASM_ITEMS: TranscriptItem[] = [
  userTurn(
    "u-search-dylink",
    "the guardrails engine refuses every grammar except two. before we rewrite the loader, check upstream: is there a known reason a grammar wasm is rejected at load",
    0,
  ),
  { ...WASM_SEARCH_ITEM, startTs: at(4_000) },
  {
    ...answer(
      "a-search-dylink",
      [
        "Yes, and it is one section. web-tree-sitter 0.20+ requires a `dylink.0` custom section in every grammar, and the aggregate `tree-sitter-wasms` set is shipped without it — that is why the same call works for two grammars and fails for fourteen. The package that works is the one whose grammars are each built from their own repo with the linker section kept.",
        "",
        "Second hit is worth noting for us: a `wasm-opt` pass strips the section, so a pipeline that optimises the grammars re-breaks them.",
      ].join("\n"),
    ),
    usage: usage(15_900, 1_940, 0, 1, 2),
  },
  userTurn(
    "u-search-runtime",
    "and the runtime itself — in a compiled binary there is no cwd to resolve from. how do people hand the runtime bytes to Parser.init",
    6,
  ),
  { ...RUNTIME_SEARCH_ITEM, startTs: at(10_000) },
  {
    ...answer(
      "a-search-runtime",
      "Same answer three times over: don't let the resolver look. Read the asset and pass the bytes. Here the asset is an embedded file import, so `Parser.init({ wasmBinary })` gets it and nothing on disk has to exist.",
    ),
    usage: usage(9_700, 1_120, 0, 7, 8),
  },
  userTurn("u-search-nothing", "search for a renderer that highlights diff rows in a gpu ui", 12),
  { ...EMPTY_SEARCH_ITEM, startTs: at(15_000) },
  userTurn("u-search-dead", "check whether wgpu can read a rendered image back on linux", 16),
  { ...FAILED_SEARCH_ITEM, startTs: at(19_000) },
  {
    ...answer(
      "a-search-shape",
      [
        "Two of those rows say what they are, and that is the point. The empty one is a real answer — nothing matched `gpuix react tree-sitter syntax highlight diff rows` — and it is drawn as no results, not as an empty table that looks like a bug. The last one is a timeout, marked in red with its error under it, and I have not answered it: an unverified claim about wgpu readback would be worse than the gap.",
      ].join("\n"),
      {
        reasoning:
          "The user asked two questions whose honest answers are 'nothing found' and 'I could not check'. The log has to keep that shape so the reader can tell a search that ran from a search that failed, and so the next turn does not treat the missing fact as an established one.",
      },
    ),
    usage: usage(11_300, 1_560, 0, 17, 20),
  },
];
