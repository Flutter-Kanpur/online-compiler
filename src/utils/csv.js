// CSV utilities for bulk problem upload.
//
// Format chosen to be Excel/Sheets-friendly: every field stays on one row,
// using literal `\n` (two chars: backslash + n) inside cells. Parser decodes
// them back to real newlines.
//
// Columns:
//   id,title,difficulty,tags,statement,examples,tests,
//   starter_python,starter_cpp,starter_java,starter_javascript,starter_c
//
// Encoding rules:
//   tags     →  pipe-separated: "math|loops|strings"
//   examples →  records joined by "|||", input/output split by ">>>"
//               e.g. "3 5>>>8|||0 0>>>0"
//   tests    →  same as examples but input/expected
//   newlines →  use literal "\n" inside any cell

// Starter code columns — one per supported language. Optional in uploads:
// if absent or empty, the importer falls back to a sensible default for
// that language.
export const STARTER_COLUMNS = [
  "starter_python",
  "starter_cpp",
  "starter_java",
  "starter_javascript",
  "starter_c",
  "starter_typescript",
  "starter_go",
  "starter_rust",
  "starter_php",
  "starter_ruby",
  "starter_dart",
  "starter_kotlin",
  "starter_swift",
  "starter_csharp",
];

export const CSV_COLUMNS = [
  "id",
  "title",
  "difficulty",
  "tags",
  "statement",
  "examples",
  "tests",
  ...STARTER_COLUMNS,
];

// Default starter snippets per language — used when a CSV row omits or
// leaves blank the matching starter_* column.
const DEFAULT_STARTER = {
  python: "# write your code here",
  cpp: "// write your code here",
  java: "// write your code here",
  javascript: "// write your code here",
  c: "// write your code here",
  typescript: "// write your code here",
  go: "// write your code here",
  rust: "// write your code here",
  php: "<?php\n// write your code here",
  ruby: "# write your code here",
  dart: "// write your code here",
  kotlin: "// write your code here",
  swift: "// write your code here",
  csharp: "// write your code here",
};

// ---------------------------------------------------------------------------
//  RFC-4180-ish CSV parsing (handles quoted fields with embedded commas/quotes)
// ---------------------------------------------------------------------------
export function parseCSV(text) {
  const rows = [];
  let field = "";
  let row = [];
  let inQuotes = false;
  let i = 0;
  const src = text.replace(/\r\n/g, "\n");

  while (i < src.length) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += ch; i++; continue;
    }
    if (ch === '"') { inQuotes = true; i++; continue; }
    if (ch === ",") { row.push(field); field = ""; i++; continue; }
    if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += ch; i++;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

// Convert literal "\n" sequences in CSV cells into real newlines.
function decodeNewlines(s) {
  if (typeof s !== "string") return s;
  return s.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function encodeNewlines(s) {
  if (typeof s !== "string") return s;
  return s.replace(/\n/g, "\\n").replace(/\t/g, "\\t");
}

function csvEscapeCell(s) {
  const str = String(s ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ---------------------------------------------------------------------------
//  Encode list-of-tests as a single cell  (input >>> output  ||| next ...)
// ---------------------------------------------------------------------------
function encodeTestsField(items, outputKey) {
  return items
    .map((it) => `${encodeNewlines(it.input || "")}>>>${encodeNewlines(it[outputKey] || "")}`)
    .join("|||");
}

function decodeTestsField(cell, outputKey) {
  if (!cell || !cell.trim()) return [];
  return cell.split("|||").map((chunk) => {
    const sep = chunk.indexOf(">>>");
    if (sep === -1) {
      return { input: decodeNewlines(chunk.trim()), [outputKey]: "" };
    }
    return {
      input: decodeNewlines(chunk.slice(0, sep)),
      [outputKey]: decodeNewlines(chunk.slice(sep + 3)),
    };
  });
}

// ---------------------------------------------------------------------------
//  Public API
// ---------------------------------------------------------------------------

/**
 * Parse a CSV string into an array of problem objects (matching the schema
 * used by src/problems.js). Returns { problems, errors }.
 */
export function parseProblemsCSV(csvText) {
  const rows = parseCSV(csvText);
  if (rows.length === 0) return { problems: [], errors: ["CSV is empty"] };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const dataRows = rows.slice(1);
  const errors = [];

  // Find column indexes
  const idx = {};
  for (const col of CSV_COLUMNS) {
    idx[col] = header.indexOf(col);
  }
  const missing = CSV_COLUMNS.filter((c) => idx[c] === -1 && !c.startsWith("starter_"));
  if (missing.length > 0) {
    errors.push(`Missing required columns: ${missing.join(", ")}`);
    return { problems: [], errors };
  }

  const problems = [];
  dataRows.forEach((row, i) => {
    const lineNo = i + 2;
    const get = (col) => (idx[col] >= 0 ? (row[idx[col]] ?? "").trim() : "");

    const id = get("id");
    const title = get("title");
    if (!id || !title) {
      errors.push(`Row ${lineNo}: missing id or title`);
      return;
    }
    const difficulty = (get("difficulty") || "easy").toLowerCase();
    if (!["starter", "easy", "medium", "hard"].includes(difficulty)) {
      errors.push(`Row ${lineNo}: difficulty must be one of starter/easy/medium/hard`);
      return;
    }
    const tags = get("tags").split("|").map((t) => t.trim()).filter(Boolean);
    const statement = decodeNewlines(get("statement"));
    const examples = decodeTestsField(get("examples"), "output");
    const tests = decodeTestsField(get("tests"), "expected");

    if (examples.length === 0) {
      errors.push(`Row ${lineNo}: at least one example required`);
      return;
    }
    if (tests.length === 0) {
      errors.push(`Row ${lineNo}: at least one test required`);
      return;
    }

    const starter = {};
    for (const col of STARTER_COLUMNS) {
      const lang = col.replace(/^starter_/, "");
      starter[lang] = decodeNewlines(get(col)) || DEFAULT_STARTER[lang] || "// write your code here";
    }

    problems.push({
      id,
      title,
      difficulty,
      vibe: difficulty,
      tags: tags.length ? tags : ["misc"],
      statement,
      examples,
      tests,
      starter,
    });
  });

  return { problems, errors };
}

/** Build a sample CSV string showing the expected format. */
export function buildSampleCSV() {
  const sample = [
    {
      id: "two-sum",
      title: "two sum",
      difficulty: "easy",
      tags: ["arrays", "hash-table"],
      statement:
        "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\nYou may assume each input has exactly one solution.",
      examples: [
        { input: "4\n2 7 11 15\n9", output: "0 1" },
        { input: "3\n3 2 4\n6", output: "1 2" },
      ],
      tests: [
        { input: "4\n2 7 11 15\n9", expected: "0 1" },
        { input: "3\n3 2 4\n6", expected: "1 2" },
        { input: "2\n3 3\n6", expected: "0 1" },
      ],
      starter: {
        python:
          "n = int(input())\nnums = list(map(int, input().split()))\ntarget = int(input())\n# your code here",
        dart:
          "import 'dart:io';\nvoid main() {\n  final n = int.parse(stdin.readLineSync()!);\n  final nums = stdin.readLineSync()!.split(' ').map(int.parse).toList();\n  final target = int.parse(stdin.readLineSync()!);\n  // your code here\n}",
      },
    },
    {
      id: "reverse-int",
      title: "reverse an integer",
      difficulty: "easy",
      tags: ["math"],
      statement: "Read an integer N. Print its digits reversed.",
      examples: [
        { input: "1234", output: "4321" },
        { input: "100", output: "1" },
      ],
      tests: [
        { input: "1234", expected: "4321" },
        { input: "100", expected: "1" },
        { input: "7", expected: "7" },
      ],
      starter: {
        python: "n = int(input())\n# your code here",
        dart: "import 'dart:io';\nvoid main() {\n  final n = int.parse(stdin.readLineSync()!);\n  // your code here\n}",
      },
    },
  ];

  const header = CSV_COLUMNS.join(",");
  const rows = sample.map((p) => {
    const cells = [
      p.id,
      p.title,
      p.difficulty,
      p.tags.join("|"),
      encodeNewlines(p.statement),
      encodeTestsField(p.examples, "output"),
      encodeTestsField(p.tests, "expected"),
      // One column per supported language. Empty cells are fine — the
      // importer will substitute a default for any blank starter.
      ...STARTER_COLUMNS.map((col) => {
        const lang = col.replace(/^starter_/, "");
        const code = p.starter[lang] ?? "";
        return encodeNewlines(code);
      }),
    ];
    return cells.map(csvEscapeCell).join(",");
  });
  return [header, ...rows].join("\n") + "\n";
}

/** Trigger a browser download of the sample CSV. */
export function downloadSampleCSV() {
  const blob = new Blob([buildSampleCSV()], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "flutterkanpur-problems-sample.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
