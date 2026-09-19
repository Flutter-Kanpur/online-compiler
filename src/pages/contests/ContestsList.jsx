import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Loader2, ListChecks, Clock, ChevronRight } from "lucide-react";
import { fetchContests, contestStatus } from "../../lib/contestsApi.js";
import { StatusPill } from "../admin/Contests.jsx";
import { useCountdown } from "../../hooks/useCountdown.js";

const CARD_THEMES = [
  { from: "#13B9FD", to: "#0553B1" },
  { from: "#a855f7", to: "#5b21b6" },
  { from: "#f59e0b", to: "#b45309" },
  { from: "#10b981", to: "#047857" },
];

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
  const active = sorted.filter((c) => contestStatus(c) !== "ended");
  const ended = sorted.filter((c) => contestStatus(c) === "ended");

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="text-center mb-10">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)", boxShadow: "0 8px 24px -6px rgba(217,119,6,0.5)" }}
        >
          <Trophy size={30} color="white" strokeWidth={2} />
        </div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Weekly Contests</h1>
        <p className="text-sm mt-1.5" style={{ color: "var(--text-secondary)" }}>
          Solve a fixed set of problems within a timed window. Compete and see your ranking!
        </p>
      </div>

      {sorted.length === 0 ? (
        <div className="card p-10 text-center">
          <ListChecks size={28} className="mx-auto mb-3" style={{ color: "var(--text-muted)" }} />
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>No contests yet — check back soon.</div>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="flex flex-wrap gap-5 justify-center mb-10">
              {active.map((c, i) => (
                <ContestCard key={c.id} contest={c} theme={CARD_THEMES[i % CARD_THEMES.length]} onOpen={() => onOpen(c)} />
              ))}
            </div>
          )}

          {ended.length > 0 && (
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>
                Past contests
              </div>
              <div className="space-y-2">
                {ended.map((c) => (
                  <PastContestRow key={c.id} contest={c} onOpen={() => onOpen(c)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ContestCard({ contest, theme, onOpen }) {
  const status = contestStatus(contest);
  const target = status === "upcoming" ? contest.startsAt : contest.endsAt;
  const { formatted, isPast } = useCountdown(target);

  return (
    <button
      onClick={onOpen}
      className="relative w-72 h-52 rounded-2xl overflow-hidden text-left transition-transform"
      style={{ background: `linear-gradient(150deg, ${theme.from} 0%, ${theme.to} 100%)` }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
    >
      <ContestCube />

      <div
        className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold"
        style={{ background: "rgba(0,0,0,0.28)", color: "white" }}
      >
        {status === "live" ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#4ade80" }} />
            {isPast ? "ending…" : formatted}
          </>
        ) : (
          <>
            <Clock size={11} /> {isPast ? "starting…" : formatted}
          </>
        )}
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between gap-2"
        style={{ background: "rgba(0,0,0,0.32)", backdropFilter: "blur(4px)" }}
      >
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">{contest.title}</div>
          <div className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>
            {new Date(contest.startsAt).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            {" · "}
            {new Date(contest.startsAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </div>
        </div>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.18)" }}
        >
          <ChevronRight size={15} color="white" />
        </div>
      </div>
    </button>
  );
}

function ContestCube() {
  return (
    <svg viewBox="0 0 288 208" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
      <circle cx="200" cy="80" r="90" fill="rgba(255,255,255,0.06)" />
      <g transform="translate(155,55)">
        <path d="M35 0L70 20V60L35 80L0 60V20L35 0Z" fill="rgba(255,255,255,0.14)" />
        <path d="M35 0L70 20L35 40L0 20L35 0Z" fill="rgba(255,255,255,0.32)" />
        <path d="M35 40V80L0 60V20L35 40Z" fill="rgba(255,255,255,0.1)" />
        <path d="M35 40V80L70 60V20L35 40Z" fill="rgba(255,255,255,0.2)" />
      </g>
      <circle cx="40" cy="40" r="3" fill="white" opacity="0.4" />
      <circle cx="55" cy="65" r="2" fill="white" opacity="0.3" />
    </svg>
  );
}

function PastContestRow({ contest, onOpen }) {
  return (
    <button onClick={onOpen} className="card p-4 w-full text-left flex items-center justify-between gap-4 transition-colors hover:bg-zinc-50">
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{contest.title}</div>
          <StatusPill status="ended" />
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {new Date(contest.startsAt).toLocaleString()} → {new Date(contest.endsAt).toLocaleString()}
        </div>
      </div>
      <ChevronRight size={16} style={{ color: "var(--text-muted)" }} className="flex-shrink-0" />
    </button>
  );
}
