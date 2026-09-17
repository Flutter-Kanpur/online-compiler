import React, { useState, useEffect, useMemo, useRef } from "react";
import { Play, Send, Loader2, Wifi, WifiOff, Zap, Smartphone } from "lucide-react";
import { fetchAllProblems } from "../../lib/db.js";
import { getInterview, dartpadEmbedUrl } from "../../interview/interviewApi.js";
import { useInterviewSocket } from "../../interview/useInterviewSocket.js";
import {
  LANG, LANG_BY_CATEGORY, starterFor, judge0Run, classifyVerdict,
  ProblemDescription, CodeArea, ResultsView, Tab,
} from "../ProblemPage.jsx";

const FLUTTER_TAB = "__flutter__";

export default function InterviewCandidate({ roomId }) {
  const [room, setRoom] = useState(null);
  const [roomError, setRoomError] = useState(null);
  const [problemsById, setProblemsById] = useState(null);
  const [name, setName] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    getInterview(roomId)
      .then(setRoom)
      .catch((e) => setRoomError(e.message));
    fetchAllProblems()
      .then((list) => setProblemsById(Object.fromEntries(list.map((p) => [p.id, p]))))
      .catch(() => setProblemsById({}));
  }, [roomId]);

  if (roomError) return <CenteredMessage title="This interview link isn't valid" detail={roomError} />;
  if (!room || !problemsById) return <CenteredMessage title="Loading interview…" spinner />;

  if (!joined) {
    return (
      <NameGate
        title={room.title}
        name={name}
        setName={setName}
        onJoin={() => setJoined(true)}
      />
    );
  }

  return <CandidateWorkspace room={room} problemsById={problemsById} candidateName={name} roomId={roomId} />;
}

function NameGate({ title, name, setName, onJoin }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-app)" }}>
      <div className="card p-8 w-full max-w-sm text-center">
        <div
          className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #13B9FD 0%, #0553B1 100%)" }}
        >
          <Zap size={22} color="white" strokeWidth={2.5} fill="white" />
        </div>
        <div className="text-lg font-bold mb-1" style={{ color: "var(--text-primary)" }}>{title}</div>
        <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
          Enter your name so the interviewer knows it's you, then start solving.
        </p>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onJoin(); }}
          placeholder="Your name"
          className="input-field mb-4 text-center"
        />
        <button
          className="btn-primary w-full justify-center"
          disabled={!name.trim()}
          onClick={onJoin}
        >
          Start interview
        </button>
      </div>
    </div>
  );
}

function CandidateWorkspace({ room, problemsById, candidateName, roomId }) {
  const problems = room.problemIds.map((id) => problemsById[id]).filter(Boolean);
  const [activeId, setActiveId] = useState(problems[0]?.id ?? (room.flutterRound ? FLUTTER_TAB : undefined));
  const isFlutterTab = activeId === FLUTTER_TAB;
  const activeProblem = isFlutterTab ? null : problemsById[activeId];

  const [language, setLanguage] = useState("python");
  const [codeByProblem, setCodeByProblem] = useState({});
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resultsByProblem, setResultsByProblem] = useState({});
  const [activeTab, setActiveTab] = useState("problem");
  const [interviewerCount, setInterviewerCount] = useState(0);

  const { connected, send } = useInterviewSocket(roomId, "candidate", (msg) => {
    if (msg.type === "presence" && msg.role === "interviewer") {
      setInterviewerCount(msg.count || 0);
    }
  });

  const sentNameRef = useRef(false);
  useEffect(() => {
    if (connected && !sentNameRef.current) {
      send({ type: "name", name: candidateName });
      sentNameRef.current = true;
    }
  }, [connected, candidateName, send]);

  const code = isFlutterTab ? "" : (codeByProblem[activeId] ?? starterFor(activeProblem, language));

  useEffect(() => {
    if (isFlutterTab) return;
    const starter = starterFor(activeProblem, language);
    setCodeByProblem((prev) => ({ ...prev, [activeId]: starter }));
    send({ type: "code", problemId: activeId, language, code: starter });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, activeId]);

  useEffect(() => {
    send({ type: "activeProblem", problemId: activeId });
  }, [activeId, send]);

  // Re-sync the interviewer with whatever's currently on screen once the
  // socket (re)connects — covers the initial connect race and any reconnect.
  useEffect(() => {
    if (!connected || isFlutterTab) return;
    send({ type: "activeProblem", problemId: activeId });
    send({ type: "code", problemId: activeId, language, code: codeByProblem[activeId] ?? starterFor(activeProblem, language) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  const debounceRef = useRef(null);
  function setCode(next) {
    setCodeByProblem((prev) => ({ ...prev, [activeId]: next }));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      send({ type: "code", problemId: activeId, language, code: next });
    }, 250);
  }

  const results = resultsByProblem[activeId] || null;

  async function handleRun() {
    setRunning(true); setActiveTab("results");
    setResultsByProblem((prev) => ({ ...prev, [activeId]: null }));
    try {
      const sampleResults = [];
      for (let i = 0; i < activeProblem.examples.length; i++) {
        const ex = activeProblem.examples[i];
        const stdin = ex.input === "(none)" ? "" : ex.input;
        const r = await judge0Run({
          sourceCode: code, languageId: LANG[language].id, stdin, expectedOutput: ex.output,
        });
        const verdict = classifyVerdict(r.status, ex.output, r.stdout);
        sampleResults.push({
          index: i + 1, input: ex.input, expected: ex.output,
          actual: (r.stdout || "").trimEnd(), stderr: r.stderr || r.compile_output || "",
          verdict, time: r.time, memory: r.memory, isSample: true,
        });
      }
      const result = { kind: "run", tests: sampleResults };
      setResultsByProblem((prev) => ({ ...prev, [activeId]: result }));
      send({ type: "result", problemId: activeId, result });
    } catch (e) {
      const result = { kind: "error", message: e.message };
      setResultsByProblem((prev) => ({ ...prev, [activeId]: result }));
      send({ type: "result", problemId: activeId, result });
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true); setActiveTab("results");
    setResultsByProblem((prev) => ({ ...prev, [activeId]: null }));
    try {
      const allResults = [];
      let passed = 0, firstFailIndex = null, maxTime = 0, maxMem = 0;
      for (let i = 0; i < activeProblem.tests.length; i++) {
        const t = activeProblem.tests[i];
        const r = await judge0Run({
          sourceCode: code, languageId: LANG[language].id, stdin: t.input, expectedOutput: t.expected,
        });
        const verdict = classifyVerdict(r.status, t.expected, r.stdout);
        const time = parseFloat(r.time || "0");
        const mem = r.memory || 0;
        if (time > maxTime) maxTime = time;
        if (mem > maxMem) maxMem = mem;
        allResults.push({
          index: i + 1, input: t.input, expected: t.expected,
          actual: (r.stdout || "").trimEnd(), stderr: r.stderr || r.compile_output || "",
          verdict, isSample: i < activeProblem.examples.length,
        });
        if (verdict === "AC") passed++;
        else { firstFailIndex = i; break; }
      }
      const allPassed = passed === activeProblem.tests.length;
      const result = {
        kind: "submit", tests: allResults, passed, total: activeProblem.tests.length,
        verdict: allPassed ? "AC" : allResults[firstFailIndex]?.verdict || "WA",
        time: maxTime, memory: maxMem,
      };
      setResultsByProblem((prev) => ({ ...prev, [activeId]: result }));
      send({ type: "result", problemId: activeId, result });
    } catch (e) {
      const result = { kind: "error", message: e.message };
      setResultsByProblem((prev) => ({ ...prev, [activeId]: result }));
      send({ type: "result", problemId: activeId, result });
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeProblem && !isFlutterTab) return <CenteredMessage title="No problems assigned to this interview" />;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-app)" }}>
      <header
        className="sticky top-0 z-40 px-4 h-12 flex items-center justify-between"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          <Zap size={16} style={{ color: "var(--accent)" }} /> {room.title}
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>{candidateName}</span>
          <ConnectionBadge connected={connected} label={connected ? (interviewerCount > 0 ? `${interviewerCount} interviewer watching` : "Live") : "Reconnecting…"} />
        </div>
      </header>

      {(problems.length > 1 || (problems.length >= 1 && room.flutterRound)) && (
        <div className="flex gap-1.5 px-4 pt-3">
          {problems.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: activeId === p.id ? "var(--accent)" : "white",
                color: activeId === p.id ? "white" : "var(--text-secondary)",
                border: "1px solid " + (activeId === p.id ? "var(--accent)" : "var(--border)"),
              }}
            >
              Problem {i + 1}
            </button>
          ))}
          {room.flutterRound && (
            <button
              onClick={() => setActiveId(FLUTTER_TAB)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              style={{
                background: isFlutterTab ? "var(--accent)" : "white",
                color: isFlutterTab ? "white" : "var(--text-secondary)",
                border: "1px solid " + (isFlutterTab ? "var(--accent)" : "var(--border)"),
              }}
            >
              <Smartphone size={12} /> Flutter
            </button>
          )}
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 py-4">
        {isFlutterTab ? (
          <FlutterPanel room={room} />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-4">
          <div className="card overflow-hidden flex flex-col" style={{ minHeight: "calc(100vh - 180px)" }}>
            <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
              <Tab icon={null} active={activeTab === "problem"} onClick={() => setActiveTab("problem")} label="Description" />
              <Tab
                icon={null}
                active={activeTab === "results"}
                onClick={() => setActiveTab("results")}
                label="Submission"
                badge={results?.kind === "submit" && results.verdict === "AC" ? "ac" : results?.kind === "submit" ? "fail" : null}
              />
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {activeTab === "problem" ? (
                <ProblemDescription problem={activeProblem} />
              ) : (
                <ResultsView results={results} running={running || submitting} />
              )}
            </div>
          </div>

          <div className="card overflow-hidden flex flex-col" style={{ background: "#0f172a", borderColor: "#0f172a", minHeight: "60vh" }}>
            <div className="px-3 py-2 flex items-center justify-between gap-2 flex-wrap" style={{ borderBottom: "1px solid #1e293b" }}>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-xs font-medium px-2.5 py-1 rounded-md cursor-pointer focus:outline-none"
                style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155" }}
              >
                {Object.entries(LANG_BY_CATEGORY).map(([cat, keys]) => (
                  <optgroup key={cat} label={cat}>
                    {keys.map((k) => <option key={k} value={k}>{LANG[k].display}</option>)}
                  </optgroup>
                ))}
              </select>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleRun}
                  disabled={running || submitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors disabled:opacity-40"
                  style={{ background: "#1e293b", color: "#e2e8f0", border: "1px solid #334155" }}
                >
                  {running ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} strokeWidth={2.5} fill="currentColor" />}
                  Run
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={running || submitting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-white transition-colors disabled:opacity-40"
                  style={{ background: "#059669" }}
                >
                  {submitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} strokeWidth={2.5} />}
                  Submit
                </button>
              </div>
            </div>
            <CodeArea code={code} setCode={setCode} />
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function FlutterPanel({ room }) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ background: "#e0f2fe", border: "1px solid #bae6fd" }}>
        <Smartphone size={16} style={{ color: "#0369a1" }} className="flex-shrink-0 mt-0.5" />
        <div className="text-xs" style={{ color: "#0c4a6e" }}>
          {room.flutterPrompt || "Write and run a Flutter widget below."}
          {" "}Your interviewer is watching your screen (DartPad doesn't support live code sync), so make sure
          screen sharing is on.
        </div>
      </div>
      <div className="card overflow-hidden" style={{ minHeight: "calc(100vh - 170px)" }}>
        <iframe
          src={dartpadEmbedUrl(room.flutterGistId)}
          title="DartPad"
          style={{ width: "100%", height: "calc(100vh - 170px)", border: "none" }}
        />
      </div>
    </div>
  );
}

function ConnectionBadge({ connected, label }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-medium"
      style={{ background: connected ? "#ecfdf5" : "#fef2f2", color: connected ? "#047857" : "#b91c1c" }}
    >
      {connected ? <Wifi size={11} /> : <WifiOff size={11} />} {label}
    </span>
  );
}

function CenteredMessage({ title, detail, spinner }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg-app)" }}>
      <div className="text-center">
        {spinner && <Loader2 size={24} className="animate-spin mx-auto mb-3" style={{ color: "var(--accent)" }} />}
        <div className="text-base font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{title}</div>
        {detail && <div className="text-sm" style={{ color: "var(--text-secondary)" }}>{detail}</div>}
      </div>
    </div>
  );
}
