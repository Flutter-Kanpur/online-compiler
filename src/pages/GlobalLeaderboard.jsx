import React, { useState, useEffect } from "react";
import { Trophy, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { fetchGlobalLeaderboard } from "../lib/db.js";

const PAGE_SIZE = 10;

// Matches Profile.jsx/App.jsx's own Avatar exactly — duplicated locally
// rather than imported, same reason Profile.jsx does: App.jsx imports this
// page, so importing Avatar back from App.jsx would be circular.
function Avatar({ name, size = 36 }) {
  const initials = (name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4, background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
    >
      {initials}
    </div>
  );
}

const MEDALS = {
  1: { background: "#fef3c7", color: "#92400e", ring: "#fbbf24" },
  2: { background: "#f1f5f9", color: "#475569", ring: "#cbd5e1" },
  3: { background: "#fed7aa", color: "#9a3412", ring: "#fb923c" },
};

export default function GlobalLeaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(0);

  useEffect(() => {
    fetchGlobalLeaderboard().then(setRows).catch(() => setRows([]));
  }, []);

  const totalPages = rows ? Math.max(1, Math.ceil(rows.length / PAGE_SIZE)) : 1;
  const pageRows = rows ? rows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE) : [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={20} style={{ color: "var(--accent)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Leaderboard</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Ranked by total problems solved, across the whole platform.
      </p>

      {rows === null ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          No one has solved a problem yet.
        </div>
      ) : (
        <>
          <div className="card overflow-hidden">
            <div
              className="px-5 py-3 flex items-center text-[11px] font-semibold uppercase tracking-wider text-white"
              style={{ background: "linear-gradient(135deg, #13B9FD 0%, #0553B1 100%)" }}
            >
              <div className="w-10 flex-shrink-0">Rank</div>
              <div className="flex-1">Participant</div>
              <div className="flex-shrink-0">Solved</div>
            </div>
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {pageRows.map((r) => {
                const medal = MEDALS[r.rank];
                const isMe = r.userId === user.id;
                return (
                  <div
                    key={r.userId}
                    className="flex items-center gap-3 px-5 py-3"
                    style={{ background: isMe ? "var(--accent-soft)" : "transparent" }}
                  >
                    <div className="w-10 flex-shrink-0 flex items-center justify-center">
                      {medal ? (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                          style={{ background: medal.background, color: medal.color, border: `2px solid ${medal.ring}` }}
                        >
                          {r.rank}
                        </div>
                      ) : (
                        <span className="font-mono font-semibold text-sm" style={{ color: "var(--text-muted)" }}>#{r.rank}</span>
                      )}
                    </div>
                    <Avatar name={r.name || r.username} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                        {r.name || r.username || "someone"}
                        {isMe && <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--accent)" }}>you</span>}
                      </div>
                      {r.username && (
                        <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>@{r.username}</div>
                      )}
                    </div>
                    <div
                      className="flex-shrink-0 px-3 py-1 rounded-full text-sm font-bold"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      {r.solvedCount}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="btn-ghost !px-2 !py-1.5 disabled:opacity-40"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i)}
                  className="w-8 h-8 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: i === page ? "var(--accent)" : "transparent",
                    color: i === page ? "white" : "var(--text-secondary)",
                  }}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page === totalPages - 1}
                className="btn-ghost !px-2 !py-1.5 disabled:opacity-40"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
