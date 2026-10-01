import React, { useState, useEffect } from "react";
import { Trophy, Loader2 } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { fetchGlobalLeaderboard } from "../lib/db.js";

export default function GlobalLeaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    fetchGlobalLeaderboard().then(setRows).catch(() => setRows([]));
  }, []);

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
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: "1px solid var(--border)" }}>
                <Th>Rank</Th>
                <Th>Participant</Th>
                <Th align="right">Solved</Th>
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
