import React, { useState, useEffect, useCallback } from "react";
import { Video, Copy, Check, ExternalLink, X, AlertTriangle, User, Loader2, Smartphone, Globe, Clock } from "lucide-react";
import { fetchAllProblems } from "../../lib/db.js";
import {
  createInterview, listInterviews, endInterview, candidateLink, interviewerLink,
} from "../../interview/interviewApi.js";

export default function Interviews() {
  const [problems, setProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [title, setTitle] = useState("");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState("");
  const [expiresAfterHours, setExpiresAfterHours] = useState("8");
  const [flutterRound, setFlutterRound] = useState(false);
  const [flutterGistId, setFlutterGistId] = useState("");
  const [flutterPrompt, setFlutterPrompt] = useState("");
  const [webuiRound, setWebuiRound] = useState(false);
  const [webuiPrompt, setWebuiPrompt] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [lastCreated, setLastCreated] = useState(null);

  const [interviews, setInterviews] = useState([]);
  const [serverDown, setServerDown] = useState(false);

  useEffect(() => {
    fetchAllProblems().then(setProblems).catch(() => {}).finally(() => setProblemsLoading(false));
  }, []);

  const refresh = useCallback(() => {
    listInterviews()
      .then((list) => { setInterviews(list); setServerDown(false); })
      .catch(() => setServerDown(true));
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (selected.size === 0 && !flutterRound && !webuiRound) return;
    setCreating(true);
    setCreateError(null);
    try {
      const room = await createInterview({
        title, problemIds: [...selected], flutterRound,
        flutterGistId: flutterGistId.trim() || null,
        flutterPrompt: flutterPrompt.trim() || null,
        webuiRound,
        webuiPrompt: webuiPrompt.trim() || null,
        timeLimitMinutes: timeLimitMinutes.trim() ? Number(timeLimitMinutes) : null,
        expiresAfterHours: Number(expiresAfterHours),
      });
      setLastCreated(room);
      setSelected(new Set());
      setTitle("");
      setTimeLimitMinutes("");
      setExpiresAfterHours("8");
      setFlutterRound(false);
      setFlutterGistId("");
      setFlutterPrompt("");
      setWebuiRound(false);
      setWebuiPrompt("");
      refresh();
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleEnd(roomId) {
    await endInterview(roomId).catch(() => {});
    refresh();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {serverDown && (
        <div className="rounded-lg p-4 flex items-start gap-3" style={{ background: "#fffbeb", border: "1px solid #fde68a" }}>
          <AlertTriangle size={18} style={{ color: "#b45309" }} className="flex-shrink-0 mt-0.5" />
          <div className="text-sm" style={{ color: "#78350f" }}>
            <div className="font-semibold mb-0.5">Interview server isn't reachable</div>
            Start it with <code className="font-mono px-1 rounded" style={{ background: "#fef3c7" }}>npm run server</code> (or{" "}
            <code className="font-mono px-1 rounded" style={{ background: "#fef3c7" }}>npm run dev:all</code> to run web + server together),
            then this page will reconnect automatically.
          </div>
        </div>
      )}

      <div className="card p-5">
        <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>New interview room</div>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Pick 1–3 DSA problems for the round. You'll get a candidate link (they solve) and an interviewer link
          (you watch their code and verdicts live, no screen share needed).
        </p>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Round title (optional) — e.g. FKCCL Organizer Round 1"
          className="input-field mb-4"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Link stays valid for
            </label>
            <select
              value={expiresAfterHours}
              onChange={(e) => setExpiresAfterHours(e.target.value)}
              className="input-field"
            >
              <option value="8">8 hours (default)</option>
              <option value="24">24 hours</option>
              <option value="72">3 days</option>
              <option value="168">7 days</option>
            </select>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
              How long the link can be opened at all, before anyone joins.
            </p>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block" style={{ color: "var(--text-secondary)" }}>
              Time limit once a candidate joins
            </label>
            <input
              type="number"
              min="1"
              step="1"
              value={timeLimitMinutes}
              onChange={(e) => setTimeLimitMinutes(e.target.value)}
              placeholder="Minutes (optional — leave blank for no limit)"
              className="input-field"
            />
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
              Countdown starts when the candidate opens the link and enters their name.
            </p>
          </div>
        </div>

        {problemsLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
        ) : problems.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            No problems yet — add some from Content → Problems first.
          </div>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-72 overflow-y-auto pr-1">
          {problems.map((p) => (
            <label
              key={p.id}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer"
              style={{
                background: selected.has(p.id) ? "var(--accent-soft)" : "#fafafa",
                border: "1px solid " + (selected.has(p.id) ? "var(--accent)" : "var(--border)"),
              }}
            >
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
              <span className="capitalize flex-1" style={{ color: "var(--text-primary)" }}>{p.title}</span>
              <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>{p.difficulty}</span>
            </label>
          ))}
        </div>
        )}

        <div className="rounded-lg p-3 mb-4" style={{ background: "#fafafa", border: "1px solid var(--border)" }}>
          <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer" style={{ color: "var(--text-primary)" }}>
            <input type="checkbox" checked={flutterRound} onChange={(e) => setFlutterRound(e.target.checked)} />
            <Smartphone size={14} /> Include a Flutter round (DartPad)
          </label>
          {flutterRound && (
            <div className="mt-3 space-y-2 pl-6">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                The candidate gets an embedded DartPad to write and run Flutter widget code. DartPad no longer
                supports live embed syncing, so the interviewer watches via screen share — there's no live code
                mirror for this round (unlike the DSA problems above).
              </p>
              <input
                value={flutterPrompt}
                onChange={(e) => setFlutterPrompt(e.target.value)}
                placeholder="Prompt shown to the candidate — e.g. 'Build a counter app with a reset button'"
                className="input-field text-sm"
              />
              <input
                value={flutterGistId}
                onChange={(e) => setFlutterGistId(e.target.value)}
                placeholder="Starter gist ID (optional) — from gist.github.com/<id>, needs a main.dart file"
                className="input-field text-sm font-mono"
              />
            </div>
          )}
        </div>

        <div className="rounded-lg p-3 mb-4" style={{ background: "#fafafa", border: "1px solid var(--border)" }}>
          <label className="flex items-center gap-2.5 text-sm font-medium cursor-pointer" style={{ color: "var(--text-primary)" }}>
            <input type="checkbox" checked={webuiRound} onChange={(e) => setWebuiRound(e.target.checked)} />
            <Globe size={14} /> Include a Web UI round (HTML/CSS/JS)
          </label>
          {webuiRound && (
            <div className="mt-3 space-y-2 pl-6">
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                The candidate gets HTML/CSS/JS editors and a live preview. Unlike the Flutter round, this stays
                fully live-synced over the same relay as the DSA problems — you'll see their code and rendered
                preview update in real time, no screen share needed.
              </p>
              <input
                value={webuiPrompt}
                onChange={(e) => setWebuiPrompt(e.target.value)}
                placeholder="Prompt shown to the candidate — e.g. 'Build a responsive pricing card'"
                className="input-field text-sm"
              />
            </div>
          )}
        </div>

        {createError && (
          <div className="text-xs mb-3" style={{ color: "#b91c1c" }}>{createError}</div>
        )}

        <button className="btn-primary" disabled={(selected.size === 0 && !flutterRound && !webuiRound) || creating} onClick={handleCreate}>
          <Video size={14} />
          {creating ? "Creating…" : `Create interview (${selected.size} problem${selected.size === 1 ? "" : "s"}${flutterRound ? " + Flutter round" : ""}${webuiRound ? " + Web UI round" : ""})`}
        </button>
      </div>

      {lastCreated && (
        <div className="card p-5" style={{ borderColor: "var(--accent)" }}>
          <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
            "{lastCreated.title}" is ready
          </div>
          <LinkRow label="Candidate link" url={candidateLink(lastCreated.roomId)} />
          <LinkRow label="Interviewer link (open this yourself)" url={interviewerLink(lastCreated.roomId)} primary />
        </div>
      )}

      <div className="card p-5">
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Active interviews</div>
        {interviews.length === 0 ? (
          <div className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>No interviews yet.</div>
        ) : (
          <div className="space-y-2">
            {interviews.map((r) => (
              <div key={r.roomId} className="rounded-lg p-3" style={{ border: "1px solid var(--border)" }}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {r.title}
                    {r.flutterRound && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: "#e0f2fe", color: "#0369a1" }}>
                        <Smartphone size={10} /> Flutter
                      </span>
                    )}
                    {r.webuiRound && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: "#ede9fe", color: "#6d28d9" }}>
                        <Globe size={10} /> Web UI
                      </span>
                    )}
                    {r.timeLimitMinutes && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: "#fef3c7", color: "#92400e" }}>
                        <Clock size={10} /> {r.timeLimitMinutes} min
                      </span>
                    )}
                    {r.expiresAfterHours && r.expiresAfterHours !== 8 && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                            style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                        <Clock size={10} /> link valid {formatExpiryLabel(r.expiresAfterHours)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill connected={r.candidateConnected} label={r.candidateConnected ? "candidate live" : "candidate offline"} />
                    {r.candidateName && (
                      <span className="inline-flex items-center gap-1 text-xs" style={{ color: "var(--text-muted)" }}>
                        <User size={11} /> {r.candidateName}
                      </span>
                    )}
                    <button
                      onClick={() => handleEnd(r.roomId)}
                      className="btn-ghost text-xs !px-2 !py-1"
                      title="End interview"
                    >
                      <X size={12} /> End
                    </button>
                  </div>
                </div>
                <LinkRow label="Candidate" url={candidateLink(r.roomId)} compact />
                <LinkRow label="Interviewer" url={interviewerLink(r.roomId)} compact primary />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatExpiryLabel(hours) {
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days}d`;
  }
  return `${hours}h`;
}

function LinkRow({ label, url, primary, compact }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — user can still select the text manually
    }
  }
  return (
    <div className={`flex items-center gap-2 ${compact ? "py-0.5" : "mb-2.5"}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-wider flex-shrink-0 ${compact ? "w-20" : "w-32"}`}
           style={{ color: primary ? "var(--accent)" : "var(--text-muted)" }}>
        {label}
      </div>
      <input readOnly value={url} className="input-field flex-1 text-xs font-mono" onFocus={(e) => e.target.select()} />
      <button onClick={copy} className="btn-ghost !px-2 !py-1.5 text-xs flex-shrink-0">
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-2 !py-1.5 text-xs flex-shrink-0">
        <ExternalLink size={12} />
      </a>
    </div>
  );
}

function StatusPill({ connected, label }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: connected ? "#ecfdf5" : "#f4f4f5", color: connected ? "#047857" : "var(--text-muted)" }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: connected ? "#10b981" : "#a1a1aa" }} />
      {label}
    </span>
  );
}
