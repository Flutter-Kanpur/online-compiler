import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "../../lib/auth.jsx";
import { fetchContestLeaderboard, contestStatus } from "../../lib/contestsApi.js";
import { StatusPill } from "../admin/Contests.jsx";
import { useCountdown } from "../../hooks/useCountdown.js";

export default function ContestLeaderboard({ contest, onBack }) {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const status = contestStatus(contest);
  const { formatted } = useCountdown(contest.endsAt);

  const refresh = useCallback(() => {
    fetchContestLeaderboard(contest.id).then(setRows).catch(() => setRows([]));
  }, [contest.id]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <button onClick={onBack} className="btn-ghost mb-4"><ArrowLeft size={14} /> Back to contest</button>

      <div className="flex items-center gap-2 mb-1">
        <Trophy size={20} style={{ color: "var(--accent)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{contest.title}</h1>
        <StatusPill status={status} />
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        {status === "live" ? `Standings update live · locks in ${formatted}` : status === "ended" ? "Final standings" : "Not started yet"}
      </p>

      {rows === null ? (
        <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
      ) : rows.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          No one has solved a problem here yet.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid var(--border)" }}>
                <Th>Rank</Th>
                <Th>Participant</Th>
                <Th align="right">Solved</Th>
                <Th align="right">Penalty (min)</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.userId}
                  style={{
                    borderBottom: "1px solid var(--border)",
                    background: r.userId === user.id ? "var(--accent-soft)" : "transparent",
                  }}
                >
                  <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: "var(--text-primary)" }}>#{r.rank}</td>
                  <td className="px-4 py-2.5" style={{ color: "var(--text-primary)" }}>
                    {r.name || r.username || "someone"}
                    {r.userId === user.id && (
                      <span className="ml-1.5 text-[10px] font-semibold uppercase" style={{ color: "var(--accent)" }}>you</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold" style={{ color: "var(--text-primary)" }}>{r.solvedCount}</td>
                  <td className="px-4 py-2.5 text-right font-mono" style={{ color: "var(--text-secondary)" }}>{r.totalPenalty.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children, align = "left" }) {
  return (
    <th
      className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider"
      style={{ color: "var(--text-muted)", textAlign: align }}
    >
      {children}
    </th>
  );
}
