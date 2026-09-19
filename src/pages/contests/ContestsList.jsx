import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Loader2, ListChecks } from "lucide-react";
import { fetchContests, contestStatus } from "../../lib/contestsApi.js";
import { StatusPill } from "../admin/Contests.jsx";
import { useCountdown } from "../../hooks/useCountdown.js";

export default function ContestsList({ onOpen }) {
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    fetchContests()
      .then(setContests)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  const order = { live: 0, upcoming: 1, ended: 2 };
  const sorted = [...contests].sort((a, b) => order[contestStatus(a)] - order[contestStatus(b)]);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={20} style={{ color: "var(--accent)" }} />
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Weekly contests</h1>
      </div>
      <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
        Solve a fixed set of problems within a timed window. Ranked by problems solved, then time +
        a penalty for wrong submissions.
      </p>

      {sorted.length === 0 ? (
        <div className="card p-10 text-center">
          <ListChecks size={28} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>No contests yet — check back soon.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((c) => (
            <ContestRow key={c.id} contest={c} onOpen={() => onOpen(c)} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContestRow({ contest, onOpen }) {
  const status = contestStatus(contest);
  const target = status === "upcoming" ? contest.startsAt : contest.endsAt;
  const { formatted, isPast } = useCountdown(target);

  return (
    <button onClick={onOpen} className="card p-4 w-full text-left flex items-center justify-between gap-4 transition-colors hover:bg-zinc-50">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{contest.title}</div>
          <StatusPill status={status} />
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {new Date(contest.startsAt).toLocaleString()} → {new Date(contest.endsAt).toLocaleString()}
        </div>
      </div>
      {status !== "ended" && (
        <div className="text-right flex-shrink-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {status === "upcoming" ? "starts in" : "ends in"}
          </div>
          <div className="text-sm font-mono font-semibold" style={{ color: "var(--accent)" }}>
            {isPast ? "—" : formatted}
          </div>
        </div>
      )}
    </button>
  );
}
