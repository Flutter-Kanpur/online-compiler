import React, { useState } from "react";
import { Plus, Trash2, Save, AlertCircle, Check } from "lucide-react";

const LANGUAGES = [
  // Core
  { key: "python", label: "Python", group: "Core" },
  { key: "cpp", label: "C++", group: "Core" },
  { key: "java", label: "Java", group: "Core" },
  { key: "javascript", label: "JavaScript", group: "Core" },
  { key: "c", label: "C", group: "Core" },
  // Web
  { key: "typescript", label: "TypeScript", group: "Web" },
  { key: "go", label: "Go", group: "Web" },
  { key: "rust", label: "Rust", group: "Web" },
  { key: "php", label: "PHP", group: "Web" },
  { key: "ruby", label: "Ruby", group: "Web" },
  // App
  { key: "dart", label: "Dart", group: "App" },
  { key: "kotlin", label: "Kotlin", group: "App" },
  { key: "swift", label: "Swift", group: "App" },
  { key: "csharp", label: "C#", group: "App" },
];

const DEFAULT_STARTER = {
  python: "# Read input and print the answer\nn = int(input())\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\nint main() {\n    // your code here\n    return 0;\n}",
  java: "import java.util.*;\npublic class Main {\n    public static void main(String[] args) {\n        // your code here\n    }\n}",
  javascript: "const data = require('fs').readFileSync(0, 'utf8').trim();\n// your code here",
  c: "#include <stdio.h>\nint main() {\n    // your code here\n    return 0;\n}",
  typescript: "const data: string = require('fs').readFileSync(0, 'utf8').trim();\n// your code here",
  go: "package main\n\nimport (\n    \"bufio\"\n    \"fmt\"\n    \"os\"\n)\n\nfunc main() {\n    reader := bufio.NewReader(os.Stdin)\n    _ = reader\n    _ = fmt.Println\n    // your code here\n}",
  rust: "use std::io::{self, Read};\n\nfn main() {\n    let mut input = String::new();\n    io::stdin().read_to_string(&mut input).unwrap();\n    // your code here\n}",
  php: "<?php\n$input = trim(stream_get_contents(STDIN));\n// your code here\necho $input;\n",
  ruby: "input = STDIN.read.strip\n# your code here\nputs input",
  dart: "import 'dart:io';\n\nvoid main() {\n  final input = stdin.readLineSync() ?? '';\n  // your code here\n  print(input);\n}",
  kotlin: "fun main() {\n    val line = readLine() ?: \"\"\n    // your code here\n    println(line)\n}",
  swift: "import Foundation\n\nlet line = readLine() ?? \"\"\n// your code here\nprint(line)",
  csharp: "using System;\nclass Program {\n    static void Main() {\n        string input = Console.In.ReadToEnd().Trim();\n        // your code here\n        Console.WriteLine(input);\n    }\n}",
};

export default function AddProblem({ onDone }) {
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [tagsInput, setTagsInput] = useState("");
  const [statement, setStatement] = useState("");
  const [examples, setExamples] = useState([{ input: "", output: "" }]);
  const [tests, setTests] = useState([{ input: "", expected: "" }]);
  const [activeLang, setActiveLang] = useState("python");
  const [starter, setStarter] = useState(DEFAULT_STARTER);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState([]);

  function autoSlug(t) {
    return t.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  function validate() {
    const errs = [];
    if (!title.trim()) errs.push("Title is required.");
    if (!id.trim()) errs.push("ID is required.");
    if (!statement.trim()) errs.push("Statement is required.");
    if (examples.length === 0 || examples.some((e) => !e.input && !e.output)) {
      errs.push("At least one complete example is required.");
    }
    if (tests.length === 0 || tests.some((t) => !t.input || !t.expected)) {
      errs.push("All test cases need both input and expected output.");
    }
    return errs;
  }

  function handleSave(e) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (errs.length === 0) {
      setSaved(true);
      setTimeout(() => onDone && onDone(), 1200);
    }
  }

  return (
    <form onSubmit={handleSave} className="max-w-4xl mx-auto fade-in">
      {saved && (
        <div className="mb-5 rounded-lg p-4 flex items-center gap-3"
             style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#10b981" }}>
            <Check size={14} color="white" strokeWidth={3} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: "#047857" }}>Problem saved</div>
            <div className="text-xs" style={{ color: "#065f46" }}>UI demo — nothing is persisted. Redirecting…</div>
          </div>
        </div>
      )}

      {errors.length > 0 && (
        <div className="mb-5 rounded-lg p-4 flex items-start gap-3"
             style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <AlertCircle size={16} style={{ color: "#dc2626" }} className="flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold mb-1" style={{ color: "#b91c1c" }}>
              Fix these issues before saving
            </div>
            <ul className="text-xs space-y-0.5" style={{ color: "#7f1d1d" }}>
              {errors.map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </div>
        </div>
      )}

      {/* Basics */}
      <Section title="Basics">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Title" required>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!id || id === autoSlug(title)) setId(autoSlug(e.target.value));
              }}
              placeholder="e.g. two sum"
              className="input-field"
            />
          </Field>
          <Field label="ID (slug)" required>
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="e.g. two-sum"
              className="input-field font-mono"
            />
          </Field>
          <Field label="Difficulty" required>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="input-field">
              <option value="starter">Starter</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </Field>
          <Field label="Tags" hint="comma-separated">
            <input
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="arrays, hash-table, math"
              className="input-field"
            />
            {tagsInput && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tagsInput.split(",").map((t) => t.trim()).filter(Boolean).map((t, i) => (
                  <span key={i} className="text-[11px] font-medium px-2 py-0.5 rounded-md"
                        style={{ background: "#f4f4f5", color: "var(--text-secondary)" }}>
                    {t}
                  </span>
                ))}
              </div>
            )}
          </Field>
        </div>
      </Section>

      {/* Statement */}
      <Section title="Problem statement">
        <Field label="Description" required hint="Plain text or markdown — line breaks are preserved.">
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            rows={6}
            placeholder="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target..."
            className="input-field font-mono leading-relaxed"
          />
        </Field>
      </Section>

      {/* Examples */}
      <Section title="Visible examples" subtitle="Shown to users on the problem page.">
        <ListEditor
          items={examples}
          setItems={setExamples}
          fields={[
            { key: "input", label: "Input" },
            { key: "output", label: "Output" },
          ]}
          addLabel="Add example"
        />
      </Section>

      {/* Tests */}
      <Section title="Test cases" subtitle="Used for grading. Include the visible examples + any hidden tests.">
        <ListEditor
          items={tests}
          setItems={setTests}
          fields={[
            { key: "input", label: "Input" },
            { key: "expected", label: "Expected output" },
          ]}
          addLabel="Add test case"
        />
      </Section>

      {/* Starter code */}
      <Section title="Starter code" subtitle="Pre-filled code per language.">
        <div className="flex border-b mb-3 overflow-x-auto" style={{ borderColor: "var(--border)" }}>
          {LANGUAGES.map((l, i) => {
            const prev = LANGUAGES[i - 1];
            const showDivider = prev && prev.group !== l.group;
            return (
              <React.Fragment key={l.key}>
                {showDivider && (
                  <div className="self-center mx-1 w-px h-4 flex-shrink-0" style={{ background: "var(--border)" }} />
                )}
                <button
                  type="button"
                  onClick={() => setActiveLang(l.key)}
                  className="px-3 py-2 text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap"
                  style={{
                    color: activeLang === l.key ? "var(--accent)" : "var(--text-secondary)",
                    borderBottom: activeLang === l.key ? "2px solid var(--accent)" : "2px solid transparent",
                    marginBottom: "-1px",
                  }}
                >
                  {l.label}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <textarea
          value={starter[activeLang]}
          onChange={(e) => setStarter({ ...starter, [activeLang]: e.target.value })}
          rows={10}
          spellCheck={false}
          className="w-full rounded-lg p-3 font-mono text-sm focus:outline-none"
          style={{
            background: "#0f172a",
            color: "#e2e8f0",
            border: "1px solid #0f172a",
            lineHeight: "1.6",
          }}
        />
      </Section>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-2 sticky bottom-0 py-4"
           style={{
             background: "linear-gradient(180deg, transparent 0%, #fafafa 30%)",
           }}>
        <button type="button" onClick={onDone} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          <Save size={14} /> Save problem
        </button>
      </div>
    </form>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div className="card p-5 mb-4">
      <div className="mb-4">
        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</div>
        {subtitle && (
          <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="text-xs font-semibold mb-1.5 flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
        {label} {required && <span style={{ color: "#dc2626" }}>*</span>}
        {hint && <span className="font-normal" style={{ color: "var(--text-muted)" }}>· {hint}</span>}
      </label>
      {children}
    </div>
  );
}

function ListEditor({ items, setItems, fields, addLabel }) {
  function update(i, key, val) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  }
  function remove(i) {
    setItems(items.filter((_, idx) => idx !== i));
  }
  function add() {
    setItems([...items, fields.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {})]);
  }
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div
          key={i}
          className="rounded-lg p-3"
          style={{ background: "#fafafa", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              #{i + 1}
            </div>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded transition-colors"
                style={{ color: "#dc2626" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fef2f2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <Trash2 size={12} /> Remove
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="text-[11px] font-semibold mb-1 block" style={{ color: "var(--text-secondary)" }}>
                  {f.label}
                </label>
                <textarea
                  value={it[f.key]}
                  onChange={(e) => update(i, f.key, e.target.value)}
                  rows={2}
                  className="w-full rounded-md p-2 font-mono text-sm focus:outline-none"
                  style={{ background: "white", border: "1px solid var(--border)", color: "var(--text-primary)" }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={add} className="btn-secondary text-xs">
        <Plus size={12} /> {addLabel}
      </button>
    </div>
  );
}
