// Imports problems from the codeparrot/apps dataset (10,000 coding problems
// with full input/output test cases, MIT licensed) straight into the
// Supabase `problems` table.
//
// Uses HuggingFace's public datasets-server REST API rather than the
// `datasets` Python library — codeparrot/apps ships a legacy "dataset
// loading script" that datasets>=3.0 refuses to execute (arbitrary code
// execution risk), so this fetches rows over plain HTTP instead. No Python,
// no API key, no dataset-script execution.
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=xxx \
//   node scripts/import-apps.mjs --limit 60 --difficulty introductory
//
// --difficulty: introductory | interview | competition | all (default: introductory)
// --limit:      how many CONVERTED problems to collect (default: 60)

import { createClient } from "@supabase/supabase-js";

const HF_DATASETS_SERVER = "https://datasets-server.huggingface.co/rows";
const DATASET = "codeparrot/apps";
const CONFIG = "all";
const SPLIT = "test";
const PAGE_SIZE = 100;
const MAX_TESTS_PER_PROBLEM = 6;
const MAX_STATEMENT_CHARS = 4000;

const DEFAULT_STARTERS = {
  python: `# read input from stdin, print result to stdout\nimport sys\ndata = sys.stdin.read().strip()\n\n# your code here\nprint(data)`,
  cpp: `#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(NULL);\n\n    // your code here\n\n    return 0;\n}`,
  java: `import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // your code here\n    }\n}`,
  javascript: `const data = require('fs').readFileSync(0, 'utf8').trim();\n// your code here\nconsole.log(data);`,
  c: `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>\n\nint main() {\n    // your code here\n    return 0;\n}`,
};

function slugify(s, max = 40) {
  return (
    s.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, max) ||
    "problem"
  );
}

function inferTitle(question) {
  if (!question) return "untitled problem";
  const first = question.split("\n").map((l) => l.trim()).find((l) => l.length > 2) || "";
  let t = first.replace(/^(problem|task|question)\s*[\d.:]*\s*/i, "");
  if (t.length > 70 || t.length < 4) t = question.replace(/\s+/g, " ").slice(0, 60).trim();
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
  if (d === "competition") return { vibe: "classic", difficulty: "hard" };
  return { vibe: "easy", difficulty: "easy" };
}

function parseTests(rawIO) {
  if (!rawIO) return null;
  let parsed;
  try {
    parsed = typeof rawIO === "string" ? JSON.parse(rawIO) : rawIO;
  } catch {
    return null;
  }
  if (parsed.fn_name) return null; // function-call style — Judge0 here is stdin/stdout only
  const inputs = Array.isArray(parsed.inputs) ? parsed.inputs : null;
  const outputs = Array.isArray(parsed.outputs) ? parsed.outputs : null;
  if (!inputs || !outputs || inputs.length === 0 || inputs.length !== outputs.length) return null;
  return inputs.slice(0, MAX_TESTS_PER_PROBLEM).map((inp, i) => {
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
  if (out.length > MAX_STATEMENT_CHARS) out = out.slice(0, MAX_STATEMENT_CHARS) + "\n\n…(statement truncated)";
  return out;
}

function rowToProblem(row, idx) {
  const q = row.question || "";
  const tests = parseTests(row.input_output);
  if (!tests) return null;
  if (tests.some((t) => t.input.length + t.expected.length > 5000)) return null;

  const title = inferTitle(q);
  const id = `apps-${row.problem_id ?? idx}-${slugify(title, 24)}`;
  const { vibe, difficulty } = difficultyToVibe(row.difficulty);
  const examples = tests.slice(0, Math.min(2, tests.length)).map((t) => ({
    input: t.input || "(none)",
    output: t.expected,
  }));

  return {
    id,
    title,
    vibe,
    difficulty,
    tags: inferTags(q),
    statement: trimStatement(q),
    examples,
    tests,
    starter: DEFAULT_STARTERS,
    source_url: row.url || null,
  };
}

// The dataset isn't shuffled — each split is laid out in contiguous
// difficulty blocks, roughly: interview [0, 3000), competition [3000, 4000),
// introductory [4000, 5000). Jumping straight to a block avoids scanning
// thousands of non-matching rows.
const DIFFICULTY_BLOCK_START = { interview: 0, competition: 3000, introductory: 4000, all: 0 };

function parseArgs() {
  const args = { difficulty: "introductory", limit: 60, startOffset: null };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--difficulty") args.difficulty = argv[++i];
    if (argv[i] === "--limit") args.limit = parseInt(argv[++i], 10);
    if (argv[i] === "--start-offset") args.startOffset = parseInt(argv[++i], 10);
  }
  if (args.startOffset == null) {
    args.startOffset = DIFFICULTY_BLOCK_START[args.difficulty] ?? 0;
  }
  return args;
}

async function fetchPage(offset, length) {
  const url =
    `${HF_DATASETS_SERVER}?dataset=${encodeURIComponent(DATASET)}` +
    `&config=${CONFIG}&split=${SPLIT}&offset=${offset}&length=${length}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HF datasets-server returned ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  const { difficulty, limit, startOffset } = parseArgs();
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.");
    process.exit(1);
  }
  const supabase = createClient(url, serviceKey);

  console.log(`Fetching "${difficulty}" problems from ${DATASET} (target: ${limit}, starting at offset ${startOffset})...`);
  const converted = [];
  let offset = startOffset;
  let total = Infinity;
  let skipped = 0;

  while (converted.length < limit && offset < total) {
    const data = await fetchPage(offset, PAGE_SIZE);
    total = Number.isFinite(data?.num_rows_total) ? data.num_rows_total : offset + PAGE_SIZE;
    const rows = Array.isArray(data?.rows) ? data.rows : [];
    if (rows.length === 0) break;

    for (const r of rows) {
      if (converted.length >= limit) break;
      const row = r.row || {};
      if (difficulty !== "all" && row.difficulty !== difficulty) continue;
      const problem = rowToProblem(row, r.row_idx ?? offset);
      if (!problem) {
        skipped++;
        continue;
      }
      converted.push(problem);
    }
    offset += PAGE_SIZE;
    console.log(`  ...scanned ${offset} rows, converted ${converted.length}, skipped ${skipped}`);
  }

  if (converted.length === 0) {
    console.log("No problems converted — nothing to seed.");
    return;
  }

  console.log(`Upserting ${converted.length} problems into Supabase...`);
  const { data, error } = await supabase.from("problems").upsert(converted, { onConflict: "id" }).select("id");
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log(`✓ Seeded ${data.length} problems from APPS (${difficulty}).`);
}

main();
