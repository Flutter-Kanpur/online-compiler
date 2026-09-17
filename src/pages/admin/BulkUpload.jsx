import React, { useState, useRef } from "react";
import {
  Upload, Download, FileSpreadsheet, X, AlertCircle, Check, Save,
  FileText, Trash2, Eye, ChevronDown, Loader2,
} from "lucide-react";
import { parseProblemsCSV, downloadSampleCSV, CSV_COLUMNS } from "../../utils/csv.js";
import { DifficultyPill } from "../ProblemsList.jsx";
import { useAuth } from "../../lib/auth.jsx";
import { bulkUpsertProblems } from "../../lib/db.js";

export default function BulkUpload({ onDone }) {
  const { user } = useAuth();
  const [fileName, setFileName] = useState(null);
  const [parseResult, setParseResult] = useState(null); // { problems, errors }
  const [dragging, setDragging] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const inputRef = useRef(null);

  function handleFile(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseResult({ problems: [], errors: ["File must have a .csv extension."] });
      setFileName(file.name);
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const result = parseProblemsCSV(text);
      setParseResult(result);
    };
    reader.readAsText(file);
  }

  function reset() {
    setFileName(null);
    setParseResult(null);
    setSaved(false);
    setExpandedRow(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleConfirm() {
    setSaving(true);
    setSaveError(null);
    try {
      await bulkUpsertProblems(problems, user.id);
      setSaved(true);
      setTimeout(() => onDone && onDone(), 1500);
    } catch (e) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const problems = parseResult?.problems || [];
  const errors = parseResult?.errors || [];
  const hasFile = !!fileName;
  const canSave = problems.length > 0 && errors.length === 0;

  return (
    <div className="max-w-5xl mx-auto fade-in">
      {saved && (
        <div className="mb-5 rounded-lg p-4 flex items-center gap-3"
             style={{ background: "#ecfdf5", border: "1px solid #a7f3d0" }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "#10b981" }}>
            <Check size={14} color="white" strokeWidth={3} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: "#047857" }}>
              {problems.length} problems imported
            </div>
            <div className="text-xs" style={{ color: "#065f46" }}>Redirecting…</div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-5 mb-5">
        {/* Upload zone */}
        <div className="card p-5">
          <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Upload a CSV file
          </div>
          <div className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Each row becomes a problem. Up to a few hundred per file is fine.
          </div>

          {!hasFile ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => inputRef.current?.click()}
              className="rounded-lg p-8 cursor-pointer flex flex-col items-center text-center transition-colors"
              style={{
                border: `2px dashed ${dragging ? "var(--accent)" : "var(--border-strong)"}`,
                background: dragging ? "var(--accent-soft)" : "#fafafa",
              }}
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                <Upload size={20} />
              </div>
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                Drop your CSV here, or <span style={{ color: "var(--accent)" }}>browse</span>
              </div>
              <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                .csv only · max ~5 MB recommended
              </div>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => handleFile(e.target.files[0])}
                className="hidden"
              />
            </div>
          ) : (
            <div className="rounded-lg p-4 flex items-center gap-3"
                 style={{ background: "#fafafa", border: "1px solid var(--border)" }}>
              <FileSpreadsheet size={20} style={{ color: "var(--accent)" }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{fileName}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {problems.length > 0 ? `${problems.length} problems parsed` : errors.length > 0 ? `${errors.length} issues` : "Empty"}
                </div>
              </div>
              <button
                onClick={reset}
                className="p-1.5 rounded hover:bg-zinc-100 transition-colors"
                title="Remove file"
              >
                <X size={14} style={{ color: "var(--text-muted)" }} />
              </button>
            </div>
          )}
        </div>

        {/* Sample CSV / docs */}
        <div className="card p-5">
          <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            Need a template?
          </div>
          <div className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
            Download a sample CSV with two example problems — open it in Excel or Google Sheets and add your own rows.
          </div>
          <button onClick={downloadSampleCSV} className="btn-primary w-full justify-center mb-3">
            <Download size={14} /> Download sample CSV
          </button>

          <details className="text-xs" style={{ color: "var(--text-secondary)" }}>
            <summary className="cursor-pointer font-medium select-none" style={{ color: "var(--text-primary)" }}>
              CSV format reference
            </summary>
            <div className="mt-3 space-y-2">
              <p>
                Columns (in order):
              </p>
              <code
                className="block p-2 rounded text-[11px] leading-relaxed whitespace-pre-wrap"
                style={{ background: "#0f172a", color: "#e2e8f0" }}
              >
                {CSV_COLUMNS.join(",")}
              </code>
              <ul className="space-y-1.5 mt-3 pl-1">
                <li><b>tags</b> — pipe-separated: <code className="font-mono">math|loops|arrays</code></li>
                <li><b>examples</b> / <b>tests</b> — record-separator <code className="font-mono">|||</code>, input/output split by <code className="font-mono">{">>>"}</code></li>
                <li><b>newlines</b> inside any cell — use literal <code className="font-mono">{"\\n"}</code></li>
                <li><b>difficulty</b> — one of <code className="font-mono">starter / easy / medium / hard</code></li>
              </ul>
            </div>
          </details>
        </div>
      </div>

      {/* Parse errors */}
      {errors.length > 0 && (
        <div className="mb-5 rounded-lg p-4"
             style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <div className="flex items-start gap-3">
            <AlertCircle size={16} style={{ color: "#dc2626" }} className="flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: "#b91c1c" }}>
                {errors.length} issue{errors.length === 1 ? "" : "s"} found
              </div>
              <ul className="text-xs space-y-0.5" style={{ color: "#7f1d1d" }}>
                {errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {problems.length > 0 && (
        <div className="card overflow-hidden mb-5">
          <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: "var(--border)" }}>
            <div>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Preview</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {problems.length} problems ready to import
              </div>
            </div>
            <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
              {problems.reduce((acc, p) => acc + p.tests.length, 0)} test cases total
            </div>
          </div>

          <div
            className="hidden md:grid grid-cols-[40px_60px_1fr_120px_80px_80px_40px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
            style={{ background: "#fafafa", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}
          >
            <div>#</div>
            <div>ID</div>
            <div>Title</div>
            <div>Difficulty</div>
            <div className="text-right">Tests</div>
            <div className="text-right">Examples</div>
            <div></div>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {problems.slice(0, 50).map((p, i) => (
              <React.Fragment key={p.id}>
                <div
                  className="grid grid-cols-1 md:grid-cols-[40px_60px_1fr_120px_80px_80px_40px] gap-3 md:gap-4 px-5 py-3 items-center cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === i ? null : i)}
                >
                  <div className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{i + 1}</div>
                  <div className="text-xs font-mono truncate" style={{ color: "var(--text-secondary)" }}>{p.id}</div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium capitalize truncate" style={{ color: "var(--text-primary)" }}>
                      {p.title}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1 md:hidden">
                      <DifficultyPill difficulty={p.difficulty} small />
                    </div>
                  </div>
                  <div className="hidden md:block"><DifficultyPill difficulty={p.difficulty} /></div>
                  <div className="hidden md:block text-right text-sm font-mono" style={{ color: "var(--text-primary)" }}>{p.tests.length}</div>
                  <div className="hidden md:block text-right text-sm font-mono" style={{ color: "var(--text-primary)" }}>{p.examples.length}</div>
                  <div className="flex justify-end">
                    <ChevronDown
                      size={14}
                      style={{
                        color: "var(--text-muted)",
                        transform: expandedRow === i ? "rotate(180deg)" : "none",
                        transition: "transform 0.15s",
                      }}
                    />
                  </div>
                </div>
                {expandedRow === i && (
                  <div className="px-5 py-4" style={{ background: "#fafafa" }}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <div className="font-semibold uppercase tracking-wider text-[10px] mb-1.5" style={{ color: "var(--text-muted)" }}>
                          Tags
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {p.tags.map((t) => (
                            <span key={t} className="px-2 py-0.5 rounded text-[11px] font-medium"
                                  style={{ background: "white", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="md:col-span-2">
                        <div className="font-semibold uppercase tracking-wider text-[10px] mb-1.5" style={{ color: "var(--text-muted)" }}>
                          Statement
                        </div>
                        <pre className="text-[12px] font-sans whitespace-pre-wrap max-h-32 overflow-y-auto p-2 rounded"
                             style={{ background: "white", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                          {p.statement.slice(0, 400)}{p.statement.length > 400 ? "…" : ""}
                        </pre>
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="font-semibold uppercase tracking-wider text-[10px] mb-1.5" style={{ color: "var(--text-muted)" }}>
                        First test case
                      </div>
                      <div className="grid grid-cols-2 gap-2 font-mono text-[12px]">
                        <pre className="p-2 rounded whitespace-pre-wrap"
                             style={{ background: "white", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                          {p.tests[0]?.input}
                        </pre>
                        <pre className="p-2 rounded whitespace-pre-wrap"
                             style={{ background: "white", border: "1px solid var(--border)", color: "var(--text-primary)" }}>
                          {p.tests[0]?.expected}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          {problems.length > 50 && (
            <div className="px-5 py-3 text-xs text-center border-t" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              Showing first 50 of {problems.length} parsed problems.
            </div>
          )}
        </div>
      )}

      {saveError && (
        <div className="mb-5 rounded-lg p-4 flex items-start gap-3"
             style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
          <AlertCircle size={16} style={{ color: "#dc2626" }} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm" style={{ color: "#b91c1c" }}>Import failed: {saveError}</div>
        </div>
      )}

      {/* Footer */}
      {hasFile && (
        <div className="flex items-center justify-end gap-2 pt-2">
          <button onClick={reset} className="btn-secondary">Cancel</button>
          <button
            onClick={handleConfirm}
            disabled={!canSave || saving}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Import {problems.length} problem{problems.length === 1 ? "" : "s"}
          </button>
        </div>
      )}
    </div>
  );
}
