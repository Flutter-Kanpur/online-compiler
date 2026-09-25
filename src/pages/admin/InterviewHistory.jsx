import React, { useState, useEffect } from "react";
import { User, FileText, Loader2, ChevronRight, ArrowLeft, Check, X, Clock } from "lucide-react";
import { fetchInterviewRoomsHistory, fetchInterviewSubmissions, fetchAllProblems } from "../../lib/db.js";
import { formatRelativeTime } from "../../utils/time.js";

export default function InterviewHistory() {
  const [rooms, setRooms] = useState(null);
  const [problems, setProblems] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [submissions, setSubmissions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInterviewRoomsHistory()
      .then(setRooms)
      .catch((e) => setError(e.message || String(e)));
    fetchAllProblems().then(setProblems).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedRoomId) return;
    setSubmissions(null);
    fetchInterviewSubmissions(selectedRoomId)
      .then(setSubmissions)
      .catch((e) => setError(e.message || String(e)));
  }, [selectedRoomId]);

  const problemTitle = (id) => problems.find((p) => p.id === id)?.title || id;
  const selectedRoom = rooms?.find((r) => r.id === selectedRoomId) || null;

  if (selectedRoomId) {
    return (
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => setSelectedRoomId(null)}
          className="flex items-center gap-1.5 text-sm font-medium mb-4"
          style={{ color: "var(--text-secondary)" }}
        >
          <ArrowLeft size={15} /> Back to interview history
        </button>

        <div className="card p-5 mb-4">
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {selectedRoom?.title || "Interview"}
          </div>
          <div className="flex items-center gap-3 mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {selectedRoom?.candidate_name && (
              <span className="inline-flex items-center gap-1"><User size={12} /> {selectedRoom.candidate_name}</span>
            )}
            {selectedRoom?.created_at && <span>{formatRelativeTime(selectedRoom.created_at)}</span>}
          </div>
        </div>

        {submissions === null ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
        ) : submissions.length === 0 ? (
          <div className="card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>
            No submit attempts recorded for this interview. This means the candidate never clicked Submit on a
            DSA problem — note that the Flutter round (screen-share only) and the Web UI round (no judged tests)
            never produce a submission record here even when the candidate was actively working.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {submissions.map((s) => (
                <div key={s.id} className="px-5 py-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <VerdictBadge verdict={s.verdict} />
                    <div className="min-w-0">
                      <div className="text-sm font-medium capitalize truncate" style={{ color: "var(--text-primary)" }}>
                        {problemTitle(s.problem_id)}
                      </div>
                      <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: "var(--text-muted)" }}>
                        <span className="font-mono">{s.language}</span>
                        <span>·</span>
                        <span>{s.passed}/{s.total} passed</span>
                        {s.time_ms != null && (
                          <>
                            <span>·</span>
                            <span>{Math.round(s.time_ms)}ms · {s.memory_kb ? (s.memory_kb / 1024).toFixed(1) : "0"}MB</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{formatRelativeTime(s.created_at)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
        Every past interview room, whether it's still live or has already ended — including ones with zero
        submissions, since "the candidate never submitted anything" is itself the answer to "did they complete it."
      </p>

      {error && (
        <div className="card p-4 mb-4 text-sm" style={{ color: "#b91c1c" }}>{error}</div>
      )}

      {rooms === null ? (
        <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
      ) : rooms.length === 0 ? (
        <div className="card p-8 text-center text-sm" style={{ color: "var(--text-muted)" }}>No interviews yet.</div>
      ) : (
        <div className="card overflow-hidden">
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {rooms.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoomId(r.id)}
                className="w-full text-left px-5 py-3.5 flex items-center justify-between gap-3 transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                    {r.title}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
                    <span className="inline-flex items-center gap-1">
                      <User size={12} /> {r.candidate_name || "Unnamed candidate"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileText size={12} /> {(r.problem_ids || []).length} problem{(r.problem_ids || []).length === 1 ? "" : "s"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock size={12} /> {formatRelativeTime(r.created_at)}
                    </span>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function VerdictBadge({ verdict }) {
  const isAC = verdict === "AC";
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ background: isAC ? "#d1fae5" : "#fee2e2" }}
      title={verdict}
    >
      {isAC ? <Check size={14} color="#059669" strokeWidth={3} /> : <X size={14} color="#b91c1c" strokeWidth={3} />}
    </div>
  );
}
