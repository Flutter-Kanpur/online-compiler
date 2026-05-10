import React, { useState, useEffect, useRef } from "react";
import {
  Play, Send, Check, X, ArrowLeft, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight,
  Loader2, ExternalLink,
} from "lucide-react";
import { PROBLEMS as LOCAL_PROBLEMS } from "./problems.js";
import { fetchProblemsSafe, DEFAULT_PAGE_SIZE } from "./api/problemsApi.js";

// ============================================================================
//  judge0 client — uses the public CE instance (ce.judge0.com)
//  for production: self-host judge0 via docker and swap JUDGE0_URL
// ============================================================================
const JUDGE0_URL = "https://ce.judge0.com";

const LANG = {
  python:     { id: 71, name: "python",     ext: "py",  display: "Python 3.8"     },
  cpp:        { id: 54, name: "c++",        ext: "cpp", display: "C++ (GCC 9.2)"  },
  java:       { id: 62, name: "java",       ext: "java",display: "Java 13"        },
  javascript: { id: 63, name: "javascript", ext: "js",  display: "Node.js 12"     },
  c:          { id: 50, name: "c",          ext: "c",   display: "C (GCC 9.2)"    },
};

async function judge0Run({ sourceCode, languageId, stdin, expectedOutput, cpuTimeLimit = 2 }) {
  const createRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source_code: sourceCode,
      language_id: languageId,
      stdin: stdin || "",
      expected_output: expectedOutput || null,
      cpu_time_limit: cpuTimeLimit,
    }),
  });
  if (!createRes.ok) throw new Error(`judge0 create failed: ${createRes.status}`);
  const { token } = await createRes.json();

  for (let i = 0; i < 25; i++) {
    await new Promise((r) => setTimeout(r, 600 + i * 80));
    const r = await fetch(`${JUDGE0_URL}/submissions/${token}?base64_encoded=false`);
    if (!r.ok) continue;
    const result = await r.json();
    if (result.status?.id > 2) return result;
  }
  throw new Error("timeout — judge0 took too long");
}

function classifyVerdict(j0Status, expected, stdout) {
  if (!j0Status) return "RE";
  const id = j0Status.id;
  if (id === 3) {
    if (expected != null && stdout != null) {
      const a = (stdout || "").trimEnd();
      const b = (expected || "").trimEnd();
      return a === b ? "AC" : "WA";
    }
    return "AC";
  }
  if (id === 4) return "WA";
  if (id === 5) return "TLE";
  if (id === 6) return "CE";
  if (id >= 7 && id <= 12) return "RE";
  return "RE";
}

// ============================================================================
//  PROBLEMS LIST
// ============================================================================
function ProblemsList({
  onOpen, solved, problems, loading, error, source,
  page, totalPages, totalRows, pageSize, onGoToPage,
}) {
  const [filter, setFilter] = useState("all");
  const [jumpInput, setJumpInput] = useState("");
  const filtered = filter === "all" ? problems : problems.filter((p) => p.difficulty === filter);
  const isApi = source === "api";
  const firstIndex = (page - 1) * pageSize + 1;
  const lastIndex = Math.min(page * pageSize, totalRows || (firstIndex + problems.length - 1));

  const Pager = ({ compact }) => {
    if (!isApi) return null;
    const goPrev = () => onGoToPage(Math.max(1, page - 1));
    const goNext = () => onGoToPage(Math.min(totalPages, page + 1));
    const goFirst = () => onGoToPage(1);
    const goLast = () => onGoToPage(totalPages);
    const submitJump = (e) => {
      e.preventDefault();
      const n = parseInt(jumpInput, 10);
      if (Number.isFinite(n) && n >= 1 && n <= totalPages) {
        onGoToPage(n);
        setJumpInput("");
      }
    };
    const btn = {
      fontFamily: "'Geist Mono', monospace",
      background: "#fff",
      border: "2px solid #1a1346",
      color: "#1a1346",
      boxShadow: "2px 2px 0 #1a1346",
    };
    return (
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "mt-6"}`}>
        <button onClick={goFirst} disabled={loading || page <= 1}
                className="p-1.5 rounded-full transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={btn} title="first page">
          <ChevronsLeft size={14} strokeWidth={2.5} />
        </button>
        <button onClick={goPrev} disabled={loading || page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={btn}>
          <ChevronLeft size={12} strokeWidth={2.5} /> prev
        </button>
        <span className="px-3 py-1.5 rounded-full text-xs font-bold"
              style={{
                fontFamily: "'Geist Mono', monospace",
                background: "#1a1346",
                color: "#FFE74C",
                border: "2px solid #1a1346",
              }}>
          page {page} / {totalPages}
        </span>
        <button onClick={goNext} disabled={loading || page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={btn}>
          next <ChevronRight size={12} strokeWidth={2.5} />
        </button>
        <button onClick={goLast} disabled={loading || page >= totalPages}
                className="p-1.5 rounded-full transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                style={btn} title="last page">
          <ChevronsRight size={14} strokeWidth={2.5} />
        </button>
        {!compact && (
          <form onSubmit={submitJump} className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              max={totalPages}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder="go to…"
              className="w-20 px-2 py-1.5 rounded-full text-xs font-bold text-center"
              style={{
                fontFamily: "'Geist Mono', monospace",
                background: "#fff",
                border: "2px solid #1a1346",
                color: "#1a1346",
                boxShadow: "2px 2px 0 #1a1346",
              }}
            />
            <button type="submit" disabled={loading || !jumpInput}
                    className="px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:-translate-y-0.5 disabled:opacity-40"
                    style={btn}>
              go
            </button>
          </form>
        )}
        {loading && <Loader2 size={14} className="animate-spin" style={{ color: "#FF3D7F" }} />}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="mb-10 relative">
        <div className="inline-block">
          <div className="absolute -top-2 -right-8 text-3xl rotate-12">✨</div>
          <h1 className="text-6xl md:text-7xl font-black leading-[0.95] tracking-tight"
              style={{ fontFamily: "'Fraunces', 'Georgia', serif", color: "#1a1346" }}>
            <span className="italic">pick</span> a problem,<br/>
            <span style={{ background: "linear-gradient(180deg, transparent 60%, #FFE74C 60%)" }}>
              flex your brain.
            </span>
          </h1>
        </div>
        <p className="text-lg mt-6 max-w-md" style={{ color: "#4a3f7a" }}>
          {isApi
            ? `${totalRows.toLocaleString()} problems available. real code. real verdicts. just write good code.`
            : `${problems.length} problems. real code. real verdicts. the compiler runs in a sandbox somewhere — just write good code.`}
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  background: isApi ? "#A8E10C" : "#FFD580",
                  border: "2px solid #1a1346",
                  color: "#1a1346",
                }}>
            {isApi ? "live · huggingface apps api" : "local · fallback set"}
          </span>
          {isApi && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    background: "#fff",
                    border: "2px solid #1a1346",
                    color: "#1a1346",
                  }}>
              showing {firstIndex.toLocaleString()}–{lastIndex.toLocaleString()} of {totalRows.toLocaleString()}
            </span>
          )}
          {error && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    background: "#FFB3B3",
                    border: "2px solid #1a1346",
                    color: "#1a1346",
                  }}>
              api failed: {error.slice(0, 60)}
            </span>
          )}
        </div>

        <Pager compact={false} />
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {[
          { k: "all", label: "everything" },
          { k: "starter", label: "starter ⭐" },
          { k: "easy", label: "easy" },
          { k: "medium", label: "medium 🔥" },
        ].map((f) => (
          <button
            key={f.k}
            onClick={() => setFilter(f.k)}
            className="px-4 py-2 rounded-full text-sm font-bold transition-all hover:scale-105"
            style={{
              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
              background: filter === f.k ? "#1a1346" : "#fff",
              color: filter === f.k ? "#FFE74C" : "#1a1346",
              border: "2.5px solid #1a1346",
              boxShadow: filter === f.k ? "3px 3px 0 #FF3D7F" : "3px 3px 0 #1a1346",
              transform: filter === f.k ? "translate(-1px, -1px)" : "none",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading && problems.length === 0 && (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse"
                 style={{
                   background: "#fffdf7",
                   border: "2.5px solid #1a134640",
                   boxShadow: "5px 5px 0 #1a134620",
                 }} />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="rounded-2xl p-8 text-center"
             style={{
               background: "#fffdf7",
               border: "2.5px solid #1a1346",
               boxShadow: "5px 5px 0 #1a1346",
               fontFamily: "'Geist Mono', monospace",
               color: "#4a3f7a",
             }}>
          no problems matched. try a different filter or refresh the batch.
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((p, i) => {
          const isSolved = solved.has(p.id);
          const accentColor = p.difficulty === "starter" ? "#7BD3F7" :
                              p.difficulty === "easy" ? "#A8E10C" : "#FF8FAB";
          return (
            <button
              key={p.id}
              onClick={() => onOpen(p)}
              className="w-full text-left group block transition-all"
              style={{ animation: `slideIn 0.4s ease-out ${i * 0.04}s both` }}
            >
              <div
                className="relative p-5 rounded-2xl flex items-center gap-4 transition-all hover:-translate-y-0.5 hover:translate-x-0.5"
                style={{
                  background: "#fffdf7",
                  border: "2.5px solid #1a1346",
                  boxShadow: "5px 5px 0 #1a1346",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "7px 7px 0 #1a1346"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "5px 5px 0 #1a1346"; }}
              >
                <div
                  className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg"
                  style={{
                    background: accentColor,
                    border: "2.5px solid #1a1346",
                    fontFamily: "'Fraunces', serif",
                    color: "#1a1346",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <h3 className="text-xl font-bold lowercase" style={{ fontFamily: "'Fraunces', serif", color: "#1a1346" }}>
                      {p.title}
                    </h3>
                    {isSolved && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                            style={{ background: "#A8E10C", color: "#1a1346", border: "1.5px solid #1a1346" }}>
                        <Check size={10} strokeWidth={3} /> done
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {p.tags.map((t) => (
                      <span key={t} className="text-[11px] px-2 py-0.5 rounded-full"
                            style={{
                              fontFamily: "'Geist Mono', monospace",
                              background: "#1a134610",
                              color: "#4a3f7a",
                            }}>
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>

                <ChevronRight size={20} className="text-[#1a1346] flex-shrink-0 transition-transform group-hover:translate-x-1" />
              </div>
            </button>
          );
        })}
      </div>

      {isApi && filtered.length > 0 && (
        <div className="mt-8 pt-6 border-t-2 flex flex-col gap-3"
             style={{ borderColor: "#1a134630" }}>
          <Pager compact={false} />
          <p className="text-xs" style={{ fontFamily: "'Geist Mono', monospace", color: "#4a3f7a" }}>
            page size: {pageSize} · {totalRows.toLocaleString()} total problems from <a
              href="https://huggingface.co/datasets/codeparrot/apps"
              target="_blank" rel="noopener noreferrer"
              className="font-bold underline" style={{ color: "#FF3D7F" }}>
              codeparrot/apps
            </a>
          </p>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
//  PROBLEM PAGE
// ============================================================================
function ProblemPage({ problem, onBack, onSolved }) {
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(problem.starter.python);
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [activeTab, setActiveTab] = useState("problem");
  const [customInput, setCustomInput] = useState("");
  const [customOutput, setCustomOutput] = useState(null);

  useEffect(() => {
    setCode(problem.starter[language]);
  }, [language, problem.id]);

  async function handleRun() {
    setRunning(true);
    setResults(null);
    setActiveTab("results");
    setCustomOutput(null);
    try {
      const sampleResults = [];
      for (let i = 0; i < problem.examples.length; i++) {
        const ex = problem.examples[i];
        const stdin = ex.input === "(none)" ? "" : ex.input;
        const r = await judge0Run({
          sourceCode: code,
          languageId: LANG[language].id,
          stdin,
          expectedOutput: ex.output,
        });
        const verdict = classifyVerdict(r.status, ex.output, r.stdout);
        sampleResults.push({
          index: i + 1,
          input: ex.input,
          expected: ex.output,
          actual: (r.stdout || "").trimEnd(),
          stderr: r.stderr || r.compile_output || "",
          verdict,
          time: r.time,
          memory: r.memory,
          isSample: true,
        });
      }
      setResults({ kind: "run", tests: sampleResults });
    } catch (e) {
      setResults({ kind: "error", message: e.message });
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setResults(null);
    setActiveTab("results");
    try {
      const allResults = [];
      let passed = 0;
      let firstFailIndex = null;
      let maxTime = 0;
      let maxMem = 0;
      for (let i = 0; i < problem.tests.length; i++) {
        const t = problem.tests[i];
        const r = await judge0Run({
          sourceCode: code,
          languageId: LANG[language].id,
          stdin: t.input,
          expectedOutput: t.expected,
        });
        const verdict = classifyVerdict(r.status, t.expected, r.stdout);
        const time = parseFloat(r.time || "0");
        const mem = r.memory || 0;
        if (time > maxTime) maxTime = time;
        if (mem > maxMem) maxMem = mem;
        allResults.push({
          index: i + 1,
          input: t.input,
          expected: t.expected,
          actual: (r.stdout || "").trimEnd(),
          stderr: r.stderr || r.compile_output || "",
          verdict,
          isSample: i < problem.examples.length,
        });
        if (verdict === "AC") passed++;
        else { firstFailIndex = i; break; }
      }
      const allPassed = passed === problem.tests.length;
      if (allPassed) onSolved(problem.id);
      setResults({
        kind: "submit",
        tests: allResults,
        passed,
        total: problem.tests.length,
        verdict: allPassed ? "AC" : allResults[firstFailIndex]?.verdict || "WA",
        time: maxTime,
        memory: maxMem,
      });
    } catch (e) {
      setResults({ kind: "error", message: e.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCustomRun() {
    setRunning(true);
    setCustomOutput({ loading: true });
    try {
      const r = await judge0Run({
        sourceCode: code,
        languageId: LANG[language].id,
        stdin: customInput,
      });
      setCustomOutput({
        stdout: r.stdout || "",
        stderr: r.stderr || r.compile_output || "",
        time: r.time,
        memory: r.memory,
        status: r.status?.description,
      });
    } catch (e) {
      setCustomOutput({ stderr: e.message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-sm font-bold transition-all hover:-translate-x-0.5"
        style={{
          fontFamily: "'Geist Mono', monospace",
          background: "#fff",
          color: "#1a1346",
          border: "2.5px solid #1a1346",
          boxShadow: "3px 3px 0 #1a1346",
        }}
      >
        <ArrowLeft size={14} strokeWidth={2.5} /> back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div
          className="rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "#fffdf7",
            border: "2.5px solid #1a1346",
            boxShadow: "5px 5px 0 #1a1346",
            minHeight: "calc(100vh - 180px)",
          }}
        >
          <div className="flex border-b-[2.5px]" style={{ borderColor: "#1a1346" }}>
            {["problem", "results"].map((t) => (
              <button
                key={t}
                onClick={() => setActiveTab(t)}
                className="px-5 py-3 text-sm font-bold transition-all relative flex items-center gap-2"
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  background: activeTab === t ? "#FFE74C" : "transparent",
                  color: "#1a1346",
                  borderRight: t === "problem" ? "2.5px solid #1a1346" : "none",
                }}
              >
                {t}
                {t === "results" && results?.kind === "submit" && results.verdict === "AC" && (
                  <span style={{ color: "#A8E10C" }}>•</span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === "problem" ? (
              <div>
                <div className="flex items-baseline gap-3 flex-wrap mb-4">
                  <h2 className="text-3xl font-black lowercase leading-tight"
                      style={{ fontFamily: "'Fraunces', serif", color: "#1a1346" }}>
                    {problem.title}
                  </h2>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider"
                    style={{
                      background: problem.difficulty === "starter" ? "#7BD3F7" :
                                  problem.difficulty === "easy" ? "#A8E10C" : "#FF8FAB",
                      color: "#1a1346",
                      border: "1.5px solid #1a1346",
                    }}
                  >
                    {problem.difficulty}
                  </span>
                </div>
                {problem.sourceUrl && (
                  <a href={problem.sourceUrl} target="_blank" rel="noopener noreferrer"
                     className="inline-flex items-center gap-1.5 text-xs font-bold mb-3 hover:underline"
                     style={{ fontFamily: "'Geist Mono', monospace", color: "#FF3D7F" }}>
                    <ExternalLink size={12} strokeWidth={2.5} />
                    original source
                  </a>
                )}
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed bg-transparent p-0 m-0"
                       style={{ color: "#2a2050" }}>
                    {problem.statement}
                  </pre>
                </div>

                <div className="mt-6">
                  <div className="text-xs font-black uppercase tracking-widest mb-3"
                       style={{ fontFamily: "'Geist Mono', monospace", color: "#FF3D7F" }}>
                    examples →
                  </div>
                  <div className="space-y-3">
                    {problem.examples.map((ex, i) => (
                      <div key={i} className="rounded-xl p-4"
                           style={{
                             background: "#1a1346",
                             border: "2px solid #1a1346",
                           }}>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest mb-1.5"
                                 style={{ fontFamily: "'Geist Mono', monospace", color: "#FFE74C" }}>
                              input
                            </div>
                            <pre className="text-sm whitespace-pre-wrap"
                                 style={{ fontFamily: "'Geist Mono', monospace", color: "#fffdf7" }}>
                              {ex.input}
                            </pre>
                          </div>
                          <div>
                            <div className="text-[10px] font-black uppercase tracking-widest mb-1.5"
                                 style={{ fontFamily: "'Geist Mono', monospace", color: "#A8E10C" }}>
                              output
                            </div>
                            <pre className="text-sm whitespace-pre-wrap"
                                 style={{ fontFamily: "'Geist Mono', monospace", color: "#fffdf7" }}>
                              {ex.output}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <ResultsView results={results} running={running || submitting} />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div
            className="rounded-2xl overflow-hidden flex flex-col flex-1"
            style={{
              background: "#1a1346",
              border: "2.5px solid #1a1346",
              boxShadow: "5px 5px 0 #1a1346",
              minHeight: "calc(60vh)",
            }}
          >
            <div className="px-4 py-3 flex items-center justify-between gap-3 flex-wrap"
                 style={{ borderBottom: "2px solid #2a2060" }}>
              <div className="flex items-center gap-2">
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-full focus:outline-none cursor-pointer"
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    background: "#FFE74C",
                    color: "#1a1346",
                    border: "2px solid #FFE74C",
                  }}
                >
                  {Object.entries(LANG).map(([k, v]) => (
                    <option key={k} value={k}>{v.display}</option>
                  ))}
                </select>
                <span className="text-[10px] font-bold uppercase tracking-widest"
                      style={{ fontFamily: "'Geist Mono', monospace", color: "#7c70a8" }}>
                  judge0 sandbox
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRun}
                  disabled={running || submitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    background: "#fffdf7",
                    color: "#1a1346",
                    border: "2px solid #fffdf7",
                  }}
                >
                  {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} strokeWidth={3} />}
                  run
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={running || submitting}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black transition-all hover:scale-105 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    fontFamily: "'Geist Mono', monospace",
                    background: "#FF3D7F",
                    color: "#fffdf7",
                    border: "2px solid #FF3D7F",
                  }}
                >
                  {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} strokeWidth={3} />}
                  submit
                </button>
              </div>
            </div>

            <CodeArea code={code} setCode={setCode} />
          </div>

          <div className="rounded-2xl p-4"
               style={{
                 background: "#fffdf7",
                 border: "2.5px solid #1a1346",
                 boxShadow: "5px 5px 0 #1a1346",
               }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-widest"
                    style={{ fontFamily: "'Geist Mono', monospace", color: "#FF3D7F" }}>
                ✏️ custom input (optional)
              </span>
              <button
                onClick={handleCustomRun}
                disabled={running || submitting}
                className="text-[10px] font-black px-2.5 py-1 rounded-full transition-all hover:scale-105 disabled:opacity-40"
                style={{
                  fontFamily: "'Geist Mono', monospace",
                  background: "#1a1346",
                  color: "#FFE74C",
                  border: "2px solid #1a1346",
                }}
              >
                run with input
              </button>
            </div>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="paste your test input here..."
              spellCheck={false}
              className="w-full bg-transparent text-sm focus:outline-none resize-none"
              style={{ fontFamily: "'Geist Mono', monospace", color: "#1a1346", minHeight: "60px" }}
            />
            {customOutput && (
              <div className="mt-3 pt-3" style={{ borderTop: "1.5px dashed #1a134640" }}>
                {customOutput.loading ? (
                  <div className="flex items-center gap-2 text-xs" style={{ color: "#4a3f7a", fontFamily: "'Geist Mono', monospace" }}>
                    <Loader2 size={12} className="animate-spin" /> running...
                  </div>
                ) : (
                  <>
                    {customOutput.stdout && (
                      <pre className="text-sm whitespace-pre-wrap" style={{ fontFamily: "'Geist Mono', monospace", color: "#1a1346" }}>
                        {customOutput.stdout}
                      </pre>
                    )}
                    {customOutput.stderr && (
                      <pre className="text-xs whitespace-pre-wrap mt-1" style={{ fontFamily: "'Geist Mono', monospace", color: "#FF3D7F" }}>
                        {customOutput.stderr}
                      </pre>
                    )}
                    {customOutput.time && (
                      <div className="text-[10px] mt-1" style={{ fontFamily: "'Geist Mono', monospace", color: "#7c70a8" }}>
                        {customOutput.time}s · {customOutput.memory}kb · {customOutput.status}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeArea({ code, setCode }) {
  const taRef = useRef(null);
  const lineCount = code.split("\n").length;

  function handleKeyDown(e) {
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = taRef.current;
      const start = ta.selectionStart, end = ta.selectionEnd;
      const newVal = code.substring(0, start) + "    " + code.substring(end);
      setCode(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 4; });
    }
  }

  return (
    <div className="flex-1 overflow-hidden flex">
      <div className="px-3 py-4 text-right select-none flex-shrink-0"
           style={{
             fontFamily: "'Geist Mono', monospace",
             color: "#4a3f7a",
             fontSize: "13px",
             lineHeight: "1.65",
             borderRight: "1px solid #2a2060",
           }}>
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <textarea
        ref={taRef}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="flex-1 bg-transparent p-4 resize-none focus:outline-none"
        style={{
          fontFamily: "'Geist Mono', monospace",
          fontSize: "13px",
          lineHeight: "1.65",
          color: "#fffdf7",
          caretColor: "#FFE74C",
        }}
      />
    </div>
  );
}

function ResultsView({ results, running }) {
  if (running) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
        <div className="text-5xl animate-bounce">☕</div>
        <div className="text-lg font-bold" style={{ fontFamily: "'Fraunces', serif", color: "#1a1346" }}>
          cooking...
        </div>
        <div className="text-xs" style={{ fontFamily: "'Geist Mono', monospace", color: "#7c70a8" }}>
          shipping to judge0 sandbox
        </div>
      </div>
    );
  }
  if (!results) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
        <div className="text-4xl opacity-40">📭</div>
        <div className="text-sm" style={{ fontFamily: "'Geist Mono', monospace", color: "#7c70a8" }}>
          no results yet — hit run or submit
        </div>
      </div>
    );
  }
  if (results.kind === "error") {
    return (
      <div className="rounded-xl p-4" style={{ background: "#FF3D7F20", border: "2px solid #FF3D7F" }}>
        <div className="text-sm font-bold mb-1" style={{ color: "#FF3D7F", fontFamily: "'Geist Mono', monospace" }}>
          oops, something broke
        </div>
        <div className="text-xs" style={{ color: "#1a1346", fontFamily: "'Geist Mono', monospace" }}>
          {results.message}
        </div>
        <div className="text-xs mt-2" style={{ color: "#4a3f7a" }}>
          if this keeps happening, the public judge0 instance might be rate-limiting. try again in a sec.
        </div>
      </div>
    );
  }

  const isSubmit = results.kind === "submit";
  const allPassed = isSubmit && results.verdict === "AC";

  return (
    <div className="space-y-4">
      {isSubmit && (
        <div
          className="rounded-2xl p-5 relative overflow-hidden"
          style={{
            background: allPassed ? "#A8E10C" : "#FF8FAB",
            border: "2.5px solid #1a1346",
          }}
        >
          {allPassed && (
            <div className="absolute -right-4 -top-4 text-7xl rotate-12 opacity-30">🎉</div>
          )}
          <div className="relative">
            <div className="text-4xl font-black lowercase mb-1"
                 style={{ fontFamily: "'Fraunces', serif", color: "#1a1346" }}>
              {allPassed ? "nice one!" : verdictHeadline(results.verdict)}
            </div>
            <div className="text-sm font-bold"
                 style={{ fontFamily: "'Geist Mono', monospace", color: "#1a1346" }}>
              {results.passed}/{results.total} tests passed
              {results.time > 0 && ` · ${(results.time * 1000).toFixed(0)}ms · ${Math.round(results.memory)}kb`}
            </div>
            {!allPassed && (
              <div className="text-sm mt-2" style={{ color: "#1a1346" }}>
                {verdictAdvice(results.verdict)}
              </div>
            )}
          </div>
        </div>
      )}

      {!isSubmit && (
        <div className="text-xs font-black uppercase tracking-widest"
             style={{ fontFamily: "'Geist Mono', monospace", color: "#FF3D7F" }}>
          example runs
        </div>
      )}

      <div className="space-y-2">
        {results.tests.map((t) => (
          <TestRow key={t.index} test={t} />
        ))}
      </div>
    </div>
  );
}

function TestRow({ test }) {
  const passed = test.verdict === "AC";
  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: passed ? "#A8E10C20" : "#FF8FAB20",
        border: `2px solid ${passed ? "#A8E10C" : "#FF3D7F"}`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: passed ? "#A8E10C" : "#FF3D7F" }}
        >
          {passed ? <Check size={12} color="#1a1346" strokeWidth={3} /> : <X size={12} color="#fffdf7" strokeWidth={3} />}
        </div>
        <span className="text-sm font-bold" style={{ fontFamily: "'Geist Mono', monospace", color: "#1a1346" }}>
          test {test.index} — {verdictLabel(test.verdict)}
        </span>
      </div>
      {!passed && (
        <div className="ml-7 space-y-1.5 text-xs" style={{ fontFamily: "'Geist Mono', monospace" }}>
          {test.input && test.input !== "" && test.input !== "(none)" && (
            <div>
              <span style={{ color: "#7c70a8" }}>input:</span>{" "}
              <span style={{ color: "#1a1346" }}>{truncate(test.input, 60)}</span>
            </div>
          )}
          <div>
            <span style={{ color: "#7c70a8" }}>expected:</span>{" "}
            <span style={{ color: "#1a1346" }}>{truncate(test.expected, 80)}</span>
          </div>
          <div>
            <span style={{ color: "#7c70a8" }}>got:</span>{" "}
            <span style={{ color: "#FF3D7F" }}>{truncate(test.actual || "(empty)", 80)}</span>
          </div>
          {test.stderr && (
            <pre className="whitespace-pre-wrap text-[11px] mt-1 p-2 rounded"
                 style={{ background: "#1a1346", color: "#FF8FAB" }}>
              {truncate(test.stderr, 300)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function truncate(s, n) {
  if (!s) return s;
  return s.length > n ? s.slice(0, n) + "..." : s;
}

function verdictLabel(v) {
  return ({
    AC: "passed", WA: "wrong answer", TLE: "too slow",
    RE: "runtime error", CE: "compile error", MLE: "out of memory",
  })[v] || v;
}

function verdictHeadline(v) {
  return ({
    WA: "almost!",
    TLE: "too slow!",
    RE: "it crashed.",
    CE: "won't compile.",
    MLE: "ran out of memory.",
  })[v] || "not yet.";
}

function verdictAdvice(v) {
  return ({
    WA: "your output doesn't match what we expected. peek at the failing test.",
    TLE: "your code is taking too long. think about a faster approach.",
    RE: "your code crashed. check for index errors, division by zero, etc.",
    CE: "syntax error or bad imports. read the compile message below.",
    MLE: "you're allocating too much. think smaller data structures.",
  })[v] || "";
}

// ============================================================================
//  MAIN APP
// ============================================================================
export default function App() {
  const [view, setView] = useState({ name: "list" });
  const [solved, setSolved] = useState(new Set());

  // problem catalog: fetched live from the api, with the local set
  // as a fallback so the app is always usable even if the api is
  // throttled / down / blocked by a corporate proxy.
  const [problems, setProblems] = useState(LOCAL_PROBLEMS);
  const [problemsSource, setProblemsSource] = useState("local"); // "api" | "local"
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // pagination — `page` is 1-indexed; `totalRows` is the full dataset
  // size returned by the api (so we can compute the page count).
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;
  const totalPages = totalRows > 0 ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;

  async function loadProblems(targetPage = 1) {
    const safePage = Math.max(1, Math.floor(targetPage));
    setLoading(true);
    setFetchError(null);
    const offset = (safePage - 1) * pageSize;
    const result = await fetchProblemsSafe({ limit: pageSize, offset });
    if (result.ok && result.problems.length > 0) {
      setProblems(result.problems);
      setProblemsSource("api");
      setTotalRows(result.total || 0);
      setPage(safePage);
      // scroll to top when paging — feels right for a list view.
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      // api failed or returned nothing usable — keep / restore the local set
      setProblems(LOCAL_PROBLEMS);
      setProblemsSource("local");
      setTotalRows(0);
      setPage(1);
      if (!result.ok) setFetchError(result.error);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProblems(1);
  }, []);

  function openProblem(p) { setView({ name: "problem", problem: p }); }
  function backToList() { setView({ name: "list" }); }
  function markSolved(id) {
    setSolved((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  return (
    <div className="min-h-screen relative" style={{ background: "#fff8e7" }}>
      <div className="fixed inset-0 pointer-events-none opacity-[0.04]"
           style={{
             backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
           }} />

      <nav className="sticky top-0 z-40 backdrop-blur-sm" style={{ background: "#fff8e7e0", borderBottom: "2.5px solid #1a1346" }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={backToList} className="flex items-center gap-2 group">
            <div className="text-2xl group-hover:rotate-12 transition-transform">⚡</div>
            <span className="text-2xl font-black lowercase tracking-tight"
                  style={{ fontFamily: "'Fraunces', serif", color: "#1a1346" }}>
              <span className="italic">spark</span>
            </span>
          </button>
          <div className="flex items-center gap-2 text-xs font-bold"
               style={{ fontFamily: "'Geist Mono', monospace", color: "#1a1346" }}>
            <span className="px-3 py-1.5 rounded-full" style={{ background: "#FFE74C", border: "2px solid #1a1346" }}>
              {solved.size} / {problems.length} solved
            </span>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {view.name === "list" && (
          <ProblemsList
            onOpen={openProblem}
            solved={solved}
            problems={problems}
            loading={loading}
            error={fetchError}
            source={problemsSource}
            page={page}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={pageSize}
            onGoToPage={loadProblems}
          />
        )}
        {view.name === "problem" && (
          <ProblemPage problem={view.problem} onBack={backToList} onSolved={markSolved} />
        )}
      </main>

      <footer className="py-8 mt-12 text-center text-xs"
              style={{ fontFamily: "'Geist Mono', monospace", color: "#4a3f7a" }}>
        powered by{" "}
        <a href="https://github.com/judge0/judge0" target="_blank" rel="noopener noreferrer"
           className="font-bold underline" style={{ color: "#FF3D7F" }}>
          judge0
        </a>
        {" "}— code execution sandbox · ce.judge0.com
      </footer>
    </div>
  );
}
