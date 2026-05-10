// src/api/problemsApi.js
//
// Fetches DSA problems WITH test cases from a free public API at runtime.
//
// Source: HuggingFace `datasets-server` REST API exposing the
// `codeparrot/apps` dataset — 10,000 coding problems sourced from
// Codeforces, AtCoder, LeetCode-style judges, Kattis, etc. License: MIT.
//
// Why this API:
//   - Free, no auth, no API key.
//   - Public CORS — works directly from the browser.
//   - Each row contains the full problem statement AND the full
//     hidden test set (`input_output` field). That's the key reason
//     we use it: LeetCode and Codeforces themselves do NOT expose
//     test cases through any public API.
//
// Endpoint: https://datasets-server.huggingface.co/rows
//   ?dataset=codeparrot/apps
//   &config=all
//   &split=test           (test split has the harder/curated batch)
//   &offset=<int>
//   &length=<int, max 100>
//
// Response shape (trimmed):
//   {
//     "rows": [
//       {
//         "row_idx": 0,
//         "row": {
//           "problem_id": "0",
//           "question": "Polycarp likes ...",
//           "input_output": "{\"inputs\": [...], \"outputs\": [...]}",
//           "difficulty": "introductory" | "interview" | "competition",
//           "url": "https://...",
//           "starter_code": ""
//         }
//       }, ...
//     ],
//     "num_rows_total": 5000
//   }

const HF_DATASETS_SERVER = "https://datasets-server.huggingface.co/rows";
const DATASET = "codeparrot/apps";
const CONFIG = "all";
const SPLIT = "test";

// We cap test cases per problem because APPS problems can ship
// hundreds of tests — too many for a quick POC submission run
// against a public Judge0 (rate limit will smash you).
const MAX_TESTS_PER_PROBLEM = 6;
const MAX_STATEMENT_CHARS = 4000;

// ---------- starter snippets, language-keyed ----------
const DEFAULT_STARTERS = {
  python: `# read input from stdin, print to stdout\nimport sys\ndata = sys.stdin.read().strip()\n\n# your code here\nprint(data)`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n\n    // your code here\n\n    return 0;\n}`,
  java: `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // your code here\n    }\n}`,
  javascript: `const data = require('fs').readFileSync(0, 'utf8').trim();\n// your code here\nconsole.log(data);`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    // your code here\n    return 0;\n}`,
};

// ---------- helpers ----------

function slugify(s, max = 40) {
  return (
    s
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, max) || "problem"
  );
}

function inferTitle(question) {
  if (!question) return "untitled problem";
  // First non-empty line, capped.
  const first = question.split("\n").map((l) => l.trim()).find((l) => l.length > 2) || "";
  let t = first.replace(/^(problem|task|question)\s*[\d.:]*\s*/i, "");
  if (t.length > 70 || t.length < 4) {
    // fall back to first 60 chars of statement
    t = question.replace(/\s+/g, " ").slice(0, 60).trim();
  }
  return t.toLowerCase();
}

function inferTags(text) {
  const t = (text || "").toLowerCase();
  const tags = [];
  const map = {
    strings: ["string", "char", "word", "letter", "alphabet", "substring"],
    math: ["sum", "product", "divisor", "prime", "factorial", "modulo"],
    arrays: ["array", "list", "sequence"],
    graphs: ["graph", "tree", "node", "edge", "vertex"],
    dp: ["dynamic programming", "subproblem", "optimal"],
    greedy: ["greedy", "minimum cost", "maximum profit"],
    sorting: ["sort", "ascending", "descending"],
    geometry: ["circle", "triangle", "rectangle", "polygon"],
  };
  for (const [tag, kws] of Object.entries(map)) {
    if (kws.some((k) => t.includes(k))) tags.push(tag);
  }
  if (tags.length === 0) tags.push("misc");
  return tags.slice(0, 4);
}

function difficultyToVibe(d) {
  if (d === "introductory") return { vibe: "easy", difficulty: "easy" };
  if (d === "interview") return { vibe: "medium", difficulty: "medium" };
  if (d === "competition") return { vibe: "classic", difficulty: "medium" };
  return { vibe: "easy", difficulty: "easy" };
}

// APPS stores `input_output` as a JSON string. Sometimes it has
// `fn_name` for function-style problems — we skip those, since
// our Judge0 setup is stdin/stdout only.
function parseTests(rawIO) {
  if (!rawIO) return null;
  let parsed;
  try {
    parsed = typeof rawIO === "string" ? JSON.parse(rawIO) : rawIO;
  } catch {
    return null;
  }
  if (parsed.fn_name) return null; // function-call style, not stdin/stdout
  const inputs = Array.isArray(parsed.inputs) ? parsed.inputs : null;
  const outputs = Array.isArray(parsed.outputs) ? parsed.outputs : null;
  if (!inputs || !outputs || inputs.length === 0 || inputs.length !== outputs.length) {
    return null;
  }
  return inputs.slice(0, MAX_TESTS_PER_PROBLEM).map((inp, i) => {
    // APPS wraps stdin in arrays sometimes — flatten.
    const stdin = Array.isArray(inp) ? inp.join("\n") : String(inp);
    const expected = Array.isArray(outputs[i]) ? outputs[i].join("\n") : String(outputs[i]);
    return {
      input: stdin.replace(/\r\n/g, "\n"),
      expected: expected.replace(/\r\n/g, "\n").replace(/\n+$/, ""),
    };
  });
}

function trimStatement(s) {
  if (!s) return "";
  let out = s.trim();
  if (out.length > MAX_STATEMENT_CHARS) {
    out = out.slice(0, MAX_STATEMENT_CHARS) + "\n\n…(statement truncated for the POC)";
  }
  return out;
}

function rowToProblem(row, idx) {
  const q = row.question || "";
  const tests = parseTests(row.input_output);
  if (!tests) return null;

  const title = inferTitle(q);
  const baseId = `apps-${row.problem_id ?? idx}-${slugify(title, 24)}`;
  const { vibe, difficulty } = difficultyToVibe(row.difficulty);
  const examples = tests.slice(0, Math.min(2, tests.length)).map((t) => ({
    input: t.input || "(none)",
    output: t.expected,
  }));

  return {
    id: baseId,
    title,
    vibe,
    difficulty,
    tags: inferTags(q),
    statement: trimStatement(q),
    examples,
    tests,
    starter: { ...DEFAULT_STARTERS },
    source: "apps",
    sourceUrl: row.url || null,
  };
}

// ---------- public API ----------

/**
 * Fetch a batch of problems (with test cases) from the live API.
 *
 * @param {object} opts
 * @param {number} [opts.limit=20]   How many problems to ATTEMPT (0–100). Some
 *                                   rows get filtered (function-call style,
 *                                   missing tests), so the returned list may
 *                                   be smaller than `limit`.
 * @param {number} [opts.offset=0]   Zero-based offset into the dataset.
 *                                   Pagination is built on top of this.
 * @param {AbortSignal} [opts.signal] Optional AbortController signal.
 * @returns {Promise<{problems: Array, total: number}>}
 *          Problems in spark's schema, plus the dataset's total row count
 *          (used by the UI to compute the page count).
 */
export async function fetchProblems({ limit = 20, offset = 0, signal } = {}) {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const safeOffset = Math.max(0, Math.floor(offset));

  const url =
    `${HF_DATASETS_SERVER}` +
    `?dataset=${encodeURIComponent(DATASET)}` +
    `&config=${encodeURIComponent(CONFIG)}` +
    `&split=${encodeURIComponent(SPLIT)}` +
    `&offset=${safeOffset}` +
    `&length=${safeLimit}`;

  const res = await fetch(url, { signal });
  if (!res.ok) {
    throw new Error(`problems API returned ${res.status} ${res.statusText}`);
  }
  const data = await res.json();
  const rows = Array.isArray(data?.rows) ? data.rows : [];
  const problems = rows
    .map((r, i) => rowToProblem(r.row || {}, r.row_idx ?? i))
    .filter(Boolean);

  // num_rows_total is what the dataset-server returns for the full split.
  const total = Number.isFinite(data?.num_rows_total) ? data.num_rows_total : 0;

  return { problems, total };
}

/**
 * Convenience: fetch problems and, on failure, return an empty result
 * (the caller decides whether to fall back to a local set).
 */
export async function fetchProblemsSafe(opts) {
  try {
    const { problems, total } = await fetchProblems(opts);
    return { ok: true, problems, total };
  } catch (err) {
    return { ok: false, problems: [], total: 0, error: err.message || String(err) };
  }
}

// Default page size for pagination — exported so the UI stays in sync
// with the value used to compute offsets.
export const DEFAULT_PAGE_SIZE = 20;
