import React, { useState, useEffect } from "react";
import { Loader2, Wifi, WifiOff, User, Eye, Smartphone, Globe, ExternalLink, MonitorPlay, X } from "lucide-react";
import { fetchAllProblems } from "../../lib/db.js";
import { getInterview, endInterview, dartpadEmbedUrl, buildWebUIDoc } from "../../interview/interviewApi.js";
import { useInterviewSocket } from "../../interview/useInterviewSocket.js";
import { useCountdown } from "../../interview/countdown.js";
import {
  LANG, ProblemDescription, CodeArea, ResultsView, Tab,
} from "../ProblemPage.jsx";

const FLUTTER_TAB = "__flutter__";
const WEBUI_TAB = "__webui__";
const EMPTY_WEBUI = { html: "", css: "", js: "" };

export default function InterviewInterviewer({ roomId }) {
  const [room, setRoom] = useState(null);
  const [roomError, setRoomError] = useState(null);
  const [problemsById, setProblemsById] = useState(null);

  useEffect(() => {
    getInterview(roomId).then(setRoom).catch((e) => setRoomError(e.message));
    fetchAllProblems()
      .then((list) => setProblemsById(Object.fromEntries(list.map((p) => [p.id, p]))))
      .catch(() => setProblemsById({}));
  }, [roomId]);

  if (roomError) return <CenteredMessage title="This interview link isn't valid" detail={roomError} />;
  if (!room || !problemsById) return <CenteredMessage title="Loading interview…" spinner />;

  return <InterviewerWatch room={room} problemsById={problemsById} roomId={roomId} />;
}

function InterviewerWatch({ room, problemsById, roomId }) {
  const problems = room.problemIds.map((id) => problemsById[id]).filter(Boolean);
  const [activeId, setActiveId] = useState(
    problems[0]?.id ?? (room.flutterRound ? FLUTTER_TAB : room.webuiRound ? WEBUI_TAB : undefined)
  );
  const isFlutterTab = activeId === FLUTTER_TAB;
  const isWebUITab = activeId === WEBUI_TAB;
  const [language, setLanguage] = useState("python");
  const [codeByProblem, setCodeByProblem] = useState({});
  const [resultsByProblem, setResultsByProblem] = useState({});
  const [candidateName, setCandidateName] = useState(null);
  const [candidateConnected, setCandidateConnected] = useState(false);
  const [activeTab, setActiveTab] = useState("problem");
  const [followCandidate, setFollowCandidate] = useState(true);
  const [webuiCode, setWebuiCode] = useState(EMPTY_WEBUI);
  const [webuiEditor, setWebuiEditor] = useState("html");
  const [ended, setEnded] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endReason, setEndReason] = useState(null);
  const [testStartedAt, setTestStartedAt] = useState(room.testStartedAt ?? null);

  async function handleEndInterview() {
    if (!window.confirm("End this interview? This disconnects the candidate and can't be undone.")) return;
    setEnding(true);
    try {
      await endInterview(roomId);
      setEndReason("manual");
      setEnded(true);
      stop();
    } catch {
      setEnding(false);
    }
  }

  const { connected, stop } = useInterviewSocket(roomId, "interviewer", (msg) => {
    switch (msg.type) {
      case "snapshot": {
        const s = msg.state;
        setCodeByProblem(s.codeByProblem || {});
        setResultsByProblem(s.lastResultByProblem || {});
        setLanguage(s.language || "python");
        setCandidateName(s.candidateName);
        setCandidateConnected(s.candidateConnected);
        if (s.webui) setWebuiCode(s.webui);
        if (s.activeProblemId) setActiveId(s.activeProblemId);
        if (s.testStartedAt) setTestStartedAt(s.testStartedAt);
        break;
      }
      case "name":
        setCandidateName(msg.name);
        break;
      case "code":
        setCodeByProblem((prev) => ({ ...prev, [msg.problemId]: msg.code }));
        setLanguage(msg.language);
        break;
      case "webuiCode":
        setWebuiCode({ html: msg.html ?? "", css: msg.css ?? "", js: msg.js ?? "" });
        break;
      case "activeProblem":
        if (followCandidate) setActiveId(msg.problemId);
        break;
      case "result":
        setResultsByProblem((prev) => ({ ...prev, [msg.problemId]: msg.result }));
        setActiveTab("results");
        break;
      case "presence":
        if (msg.role === "candidate") setCandidateConnected(msg.connected);
        break;
      case "timing":
        setTestStartedAt(msg.testStartedAt);
        break;
      case "ended":
        setEndReason(msg.reason || "manual");
        setEnded(true);
        stop();
        break;
      default:
        break;
    }
  });

  const timeRemaining = useCountdown(testStartedAt, room.timeLimitMinutes);

  const activeProblem = (isFlutterTab || isWebUITab) ? null : problemsById[activeId];
  const code = codeByProblem[activeId] ?? "";
  const results = resultsByProblem[activeId] || null;

  if (!activeProblem && !isFlutterTab && !isWebUITab) return <CenteredMessage title="No problems assigned to this interview" />;
  if (ended) {
    const timedOut = endReason === "timeout";
    return (
      <CenteredMessage
        title={timedOut ? "Time's up" : "Interview ended"}
        detail={
          timedOut
            ? "The candidate's time limit was reached and the interview ended automatically. Find this session under Interview history in the admin panel."
            : "The candidate has been disconnected. Find this session under Interview history in the admin panel."
        }
      />
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-app)" }}>
      <header
        className="sticky top-0 z-40 px-4 h-12 flex items-center justify-between flex-wrap gap-2"
        style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          <Eye size={16} style={{ color: "var(--accent)" }} /> {room.title} <span className="text-xs font-normal" style={{ color: "var(--text-muted)" }}>· interviewer view</span>
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-medium" style={{ background: "#f4f4f5" }}>
            <User size={11} /> {candidateName || "waiting for candidate…"}
          </span>
          <ConnectionBadge
            connected={candidateConnected}
            label={candidateConnected ? "Candidate live" : "Candidate offline"}
          />
          <ConnectionBadge
            connected={connected}
            label={connected ? "Connected" : "Reconnecting…"}
          />
          {timeRemaining && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md font-mono font-semibold"
              style={{ background: "#f4f4f5", color: "var(--text-primary)" }}
            >
              {timeRemaining}
            </span>
          )}
          <button
            onClick={handleEndInterview}
            disabled={ending}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors disabled:opacity-50"
            style={{ background: "#fee2e2", color: "#b91c1c" }}
          >
            <X size={12} /> {ending ? "Ending…" : "End interview"}
          </button>
        </div>
      </header>

      {problems.length + (room.flutterRound ? 1 : 0) + (room.webuiRound ? 1 : 0) > 1 && (
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex gap-1.5">
            {problems.map((p, i) => (
              <button
                key={p.id}
                onClick={() => { setActiveId(p.id); setFollowCandidate(false); }}
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
                onClick={() => { setActiveId(FLUTTER_TAB); setFollowCandidate(false); }}
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
            {room.webuiRound && (
              <button
                onClick={() => { setActiveId(WEBUI_TAB); setFollowCandidate(false); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{
                  background: isWebUITab ? "var(--accent)" : "white",
                  color: isWebUITab ? "white" : "var(--text-secondary)",
                  border: "1px solid " + (isWebUITab ? "var(--accent)" : "var(--border)"),
                }}
              >
                <Globe size={12} /> Web UI
              </button>
            )}
          </div>
          <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer" style={{ color: "var(--text-secondary)" }}>
            <input type="checkbox" checked={followCandidate} onChange={(e) => setFollowCandidate(e.target.checked)} />
            Follow candidate
          </label>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 py-4">
        {isFlutterTab ? (
          <FlutterWatchPanel room={room} />
        ) : isWebUITab ? (
          <WebUIWatchPanel room={room} webuiCode={webuiCode} activeEditor={webuiEditor} setActiveEditor={setWebuiEditor} />
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
                <ResultsView results={results} running={false} />
              )}
            </div>
          </div>

          <div className="card overflow-hidden flex flex-col" style={{ background: "#0f172a", borderColor: "#0f172a", minHeight: "60vh" }}>
            <div className="px-3 py-2 flex items-center justify-between gap-2" style={{ borderBottom: "1px solid #1e293b" }}>
              <div className="text-xs font-medium px-2.5 py-1 rounded-md" style={{ background: "#1e293b", color: "#e2e8f0" }}>
                {LANG[language]?.display || language}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "#64748b" }}>
                read-only · live mirror
              </div>
            </div>
            {code ? (
              <CodeArea code={code} setCode={() => {}} readOnly />
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm" style={{ color: "#64748b" }}>
                Candidate hasn't opened this problem yet.
              </div>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function WebUIWatchPanel({ room, webuiCode, activeEditor, setActiveEditor }) {
  const [previewDoc, setPreviewDoc] = useState(() => buildWebUIDoc(webuiCode));
  useEffect(() => {
    const t = setTimeout(() => setPreviewDoc(buildWebUIDoc(webuiCode)), 300);
    return () => clearTimeout(t);
  }, [webuiCode]);

  const hasCode = webuiCode.html || webuiCode.css || webuiCode.js;

  return (
    <div className="space-y-3">
      {room.webuiPrompt && (
        <div className="rounded-lg p-3 flex items-start gap-2.5" style={{ background: "#faf5ff", border: "1px solid #e9d5ff" }}>
          <Globe size={16} style={{ color: "#7c3aed" }} className="flex-shrink-0 mt-0.5" />
          <div className="text-xs" style={{ color: "#581c87" }}>{room.webuiPrompt}</div>
        </div>
      )}
      {!hasCode ? (
        <div className="card p-12 text-center text-sm" style={{ color: "var(--text-muted)" }}>
          Candidate hasn't opened the Web UI round yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card overflow-hidden flex flex-col" style={{ background: "#0f172a", borderColor: "#0f172a", minHeight: "60vh" }}>
            <div className="flex items-center justify-between" style={{ borderBottom: "1px solid #1e293b" }}>
              <div className="flex">
                {["html", "css", "js"].map((k) => (
                  <button
                    key={k}
                    onClick={() => setActiveEditor(k)}
                    className="px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors"
                    style={{
                      color: activeEditor === k ? "#e2e8f0" : "#64748b",
                      borderBottom: activeEditor === k ? "2px solid var(--accent)" : "2px solid transparent",
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div className="text-[10px] font-medium uppercase tracking-wider pr-3" style={{ color: "#64748b" }}>
                read-only · live mirror
              </div>
            </div>
            <CodeArea code={webuiCode[activeEditor]} setCode={() => {}} readOnly />
          </div>

          <div className="card overflow-hidden flex flex-col" style={{ minHeight: "60vh" }}>
            <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
              Live preview
            </div>
            <iframe
              title="Web UI preview"
              srcDoc={previewDoc}
              sandbox="allow-scripts"
              className="flex-1"
              style={{ width: "100%", border: "none", background: "white" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FlutterWatchPanel({ room }) {
  return (
    <div className="max-w-2xl mx-auto text-center py-12">
      <div
        className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center"
        style={{ background: "#e0f2fe" }}
      >
        <MonitorPlay size={26} style={{ color: "#0369a1" }} />
      </div>
      <div className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>
        Flutter round — watch via screen share
      </div>
      <p className="text-sm mb-1" style={{ color: "var(--text-secondary)" }}>
        DartPad no longer supports live embed syncing (Google discontinued that API), so there's no code mirror
        for this round like there is for the DSA problems. Ask the candidate to share their screen instead.
      </p>
      {room.flutterPrompt && (
        <div className="mt-4 mb-4 rounded-lg p-4 text-left text-sm" style={{ background: "#fafafa", border: "1px solid var(--border)" }}>
          <div className="text-[11px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-muted)" }}>
            Prompt
          </div>
          <div style={{ color: "var(--text-primary)" }}>{room.flutterPrompt}</div>
        </div>
      )}
      <a
        href={dartpadEmbedUrl(room.flutterGistId)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary inline-flex mt-2"
      >
        <ExternalLink size={14} /> Open the same starter code yourself
      </a>
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
