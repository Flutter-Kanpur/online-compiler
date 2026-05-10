#!/usr/bin/env python3
"""
import-apps.py — Convert the APPS dataset into the format spark.jsx expects.

APPS: 10,000 coding problems with statements and test cases.
HuggingFace: codeparrot/apps
License: MIT

USAGE:
    pip install datasets
    python import-apps.py --difficulty introductory --limit 50 --output problems.json

OUTPUT FORMAT (matches spark.jsx PROBLEMS array):
    [
      {
        "id": "apps-0000",
        "title": "Polycarp's Words",
        "vibe": "easy",
        "difficulty": "easy",
        "tags": ["strings"],
        "statement": "...",
        "examples": [{"input": "...", "output": "..."}],
        "tests": [{"input": "...", "expected": "..."}],
        "starter": {"python": "...", "cpp": "...", ...}
      },
      ...
    ]

ARGS:
    --difficulty   one of: introductory, interview, competition (default: introductory)
    --limit        max problems to import (default: 50)
    --output       output JSON file (default: apps-problems.json)
    --max-tests    cap on test cases per problem (default: 6)
                   APPS problems can have hundreds of tests; cap for sane UX
"""

import argparse
import json
import re
from pathlib import Path

try:
    from datasets import load_dataset
except ImportError:
    print("ERROR: install dependencies first: pip install datasets")
    exit(1)


def slugify(text, max_len=40):
    s = re.sub(r"[^\w\s-]", "", text.lower())
    s = re.sub(r"[\s_-]+", "-", s).strip("-")
    return s[:max_len]


def extract_title(question_text):
    """APPS doesn't ship clean titles; derive one from the first line."""
    first_line = question_text.split("\n", 1)[0].strip()
    if len(first_line) > 80 or len(first_line) < 3:
        return "untitled problem"
    # strip leading "Problem N." or similar
    first_line = re.sub(r"^(problem|task|question)\s*[\d.:]*\s*", "", first_line, flags=re.IGNORECASE)
    return first_line[:80].lower()


def infer_tags(question_text, difficulty):
    """Crude topic inference. You'd refine this with a real classifier later."""
    text = question_text.lower()
    tags = []
    keywords = {
        "strings":      ["string", "char", "word", "letter", "alphabet", "substring"],
        "math":         ["sum", "product", "divisor", "prime", "factorial", "modulo", "fibonacci"],
        "arrays":       ["array", "list", "sequence"],
        "graphs":       ["graph", "tree", "node", "edge", "vertex", "path"],
        "dp":           ["dynamic programming", "subproblem", "optimal"],
        "geometry":     ["circle", "triangle", "rectangle", "polygon", "coordinate"],
        "loops":        ["repeat", "iterate", "for each"],
        "sorting":      ["sort", "ascending", "descending"],
        "search":       ["binary search", "find the position"],
        "greedy":       ["greedy", "minimum cost", "maximum profit"],
    }
    for tag, kws in keywords.items():
        if any(k in text for k in kws):
            tags.append(tag)
    if not tags:
        tags = ["general"]
    return tags[:3]  # keep it tight


def map_difficulty(apps_diff):
    return {
        "introductory": "easy",
        "interview":    "medium",
        "competition":  "hard",
    }.get(apps_diff, "medium")


def map_vibe(apps_diff, idx):
    if apps_diff == "introductory" and idx < 3:
        return "warmup"
    return {
        "introductory": "easy",
        "interview":    "medium",
        "competition":  "classic",
    }.get(apps_diff, "easy")


def make_starter_code(language_hints):
    """Generic stdin/stdout boilerplate. APPS problems are mostly stdin-based."""
    return {
        "python": "# read input from stdin, print result to stdout\n\nimport sys\ndata = sys.stdin.read().split()\n# your solution here\n",
        "cpp": "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    // your solution here\n    return 0;\n}\n",
        "java": "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        // your solution here\n    }\n}\n",
        "javascript": "const data = require('fs').readFileSync(0, 'utf8').trim();\n// your solution here\n",
        "c": "#include <stdio.h>\n\nint main() {\n    // your solution here\n    return 0;\n}\n",
    }


def convert(apps_sample, idx, max_tests=6):
    """Turn one APPS sample into a spark.jsx-compatible problem."""
    question = apps_sample["question"]
    difficulty = apps_sample["difficulty"]
    problem_id = apps_sample["problem_id"]

    # input_output is a JSON-encoded string with {"inputs": [...], "outputs": [...]}
    io_raw = apps_sample.get("input_output", "")
    if not io_raw:
        return None
    try:
        io_data = json.loads(io_raw)
    except (json.JSONDecodeError, TypeError):
        return None

    inputs = io_data.get("inputs", [])
    outputs = io_data.get("outputs", [])

    # Skip problems that use call-based testing (require fn_name) — we only support stdin/stdout
    if io_data.get("fn_name"):
        return None
    if not inputs or not outputs or len(inputs) != len(outputs):
        return None

    # Cap tests at max_tests for sane UI
    n_tests = min(len(inputs), max_tests)
    test_pairs = list(zip(inputs[:n_tests], outputs[:n_tests]))

    # APPS test cases can be lists or strings; coerce to strings
    def coerce(x):
        if isinstance(x, list):
            return "".join(str(v) for v in x)
        return str(x)

    test_pairs = [(coerce(i).rstrip("\n"), coerce(o).rstrip("\n")) for i, o in test_pairs]

    # Skip if any test is huge (> 5kb) — bad UX, often I/O-heavy
    if any(len(i) + len(o) > 5000 for i, o in test_pairs):
        return None

    # First 2 are visible "examples", rest are hidden "tests"
    examples = [{"input": i, "output": o} for i, o in test_pairs[:2]]
    tests = [{"input": i, "expected": o} for i, o in test_pairs]

    title = extract_title(question)
    return {
        "id": f"apps-{problem_id:04d}",
        "title": title,
        "vibe": map_vibe(difficulty, idx),
        "difficulty": map_difficulty(difficulty),
        "tags": infer_tags(question, difficulty),
        "statement": question.strip(),
        "examples": examples,
        "tests": tests,
        "starter": make_starter_code(None),
        "source_url": apps_sample.get("url", ""),
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--difficulty", default="introductory",
                    choices=["introductory", "interview", "competition", "all"])
    ap.add_argument("--limit", type=int, default=50)
    ap.add_argument("--output", default="apps-problems.json")
    ap.add_argument("--max-tests", type=int, default=6)
    args = ap.parse_args()

    print(f"loading APPS dataset from HuggingFace (this takes a bit)...")
    if args.difficulty == "all":
        ds = load_dataset("codeparrot/apps", split="train")
    else:
        ds = load_dataset("codeparrot/apps", split="train", difficulties=[args.difficulty])

    print(f"loaded {len(ds)} problems. converting up to {args.limit}...")

    converted = []
    skipped = 0
    for i, sample in enumerate(ds):
        if len(converted) >= args.limit:
            break
        result = convert(sample, len(converted), max_tests=args.max_tests)
        if result is None:
            skipped += 1
            continue
        converted.append(result)
        if (len(converted)) % 10 == 0:
            print(f"  ...{len(converted)} converted (skipped {skipped})")

    out_path = Path(args.output)
    out_path.write_text(json.dumps(converted, indent=2))
    print(f"\n✓ wrote {len(converted)} problems to {out_path}")
    print(f"  ({skipped} skipped: no test cases, fn-based testing, or oversized tests)")
    print(f"\nnext step: in spark.jsx, replace the PROBLEMS array with:")
    print(f"  import problems from './{out_path}';")
    print(f"  const PROBLEMS = problems;")


if __name__ == "__main__":
    main()
