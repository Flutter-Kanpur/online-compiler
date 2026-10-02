import React, { useState, useEffect, useMemo } from "react";
import { Trophy, Loader2, ChevronLeft, ChevronRight, Crown, Users, CheckCircle2, Globe2 } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { fetchGlobalLeaderboard } from "../lib/db.js";

const PAGE_SIZE = 10;

// Duplicated locally (like Profile.jsx) — App.jsx imports this page, so
// importing Avatar back from App.jsx would be circular.
function Avatar({ name, size = 44, ring }) {
  const initials = (name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
        boxShadow: ring ? `0 0 0 3px white, 0 0 0 6px ${ring}` : undefined,
      }}
    >
      {initials}
    </div>
  );
}

const regionNames = (() => {
  try { return new Intl.DisplayNames(["en"], { type: "region" }); } catch { return null; }
})();
const countryName = (code) => {
  try { return regionNames?.of(code) || code; } catch { return code; }
};

function Flag({ code, height = 14 }) {
  const [broken, setBroken] = useState(false);
  if (!code || broken) return null;
  return (
    <img
      src={`https://flagcdn.com/w40/${code.toLowerCase()}.png`}
      alt={code}
      title={countryName(code)}
      onError={() => setBroken(true)}
      className="rounded-sm flex-shrink-0 object-cover"
      style={{ height, width: height * 1.4, boxShadow: "0 0 0 1px rgba(0,0,0,0.08)" }}
    />
  );
}

const MEDALS = {
  1: { background: "#fef3c7", color: "#92400e", ring: "#fbbf24", label: "1st" },
  2: { background: "#f1f5f9", color: "#475569", ring: "#cbd5e1", label: "2nd" },
  3: { background: "#fed7aa", color: "#9a3412", ring: "#fb923c", label: "3rd" },
};

function StatChip({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(255,255,255,0.16)", backdropFilter: "blur(4px)" }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <div className="text-xl font-bold text-white leading-tight">{value}</div>
        <div className="text-[11px] uppercase tracking-wider text-white/75">{label}</div>
      </div>
    </div>
  );
}

function PodiumCard({ row, place, isMe }) {
  const medal = MEDALS[place] || MEDALS[3];
  const first = place === 1;
  return (
    <div
      className={`card flex flex-col items-center text-center px-3 sm:px-5 pb-5 relative ${first ? "pt-8" : "pt-6 mt-6 sm:mt-10"}`}
      style={{
        borderColor: medal.ring,
        borderWidth: 2,
        background: isMe ? "var(--accent-soft)" : `linear-gradient(180deg, ${medal.background} 0%, white 55%)`,
      }}
    >
      {first && (
        <Crown size={28} className="absolute -top-4 left-1/2 -translate-x-1/2" style={{ color: "#f59e0b", fill: "#fbbf24" }} />
      )}
      <div
        className="absolute top-2 left-3 text-[11px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: medal.ring, color: "white" }}
      >
        #{row.rank}
      </div>
      <Avatar name={row.name || row.username} size={first ? 76 : 60} ring={medal.ring} />
      <div className="mt-4 text-sm sm:text-base font-bold truncate max-w-full" style={{ color: "var(--text-primary)" }}>
        {row.name || row.username || "someone"}
      </div>
      {row.username && (
        <div className="text-xs truncate max-w-full" style={{ color: "var(--text-muted)" }}>@{row.username}</div>
      )}
      {row.countryCode && (
        <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          <Flag code={row.countryCode} />
          <span className="truncate">{countryName(row.countryCode)}</span>
        </div>
      )}
      <div className="mt-4 leading-none">
        <span className="text-3xl sm:text-4xl font-extrabold" style={{ color: medal.color }}>{row.solvedCount}</span>
        <div className="text-[11px] uppercase tracking-wider mt-1" style={{ color: "var(--text-muted)" }}>solved</div>
      </div>
    </div>
  );
}

export default function GlobalLeaderboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState(null);
  const [page, setPage] = useState(0);
  const [country, setCountry] = useState("");

  useEffect(() => {
    fetchGlobalLeaderboard().then(setRows).catch(() => setRows([]));
  }, []);

  const countries = useMemo(() => {
    const set = new Set((rows || []).map((r) => r.countryCode).filter(Boolean));
    return [...set].sort((a, b) => countryName(a).localeCompare(countryName(b)));
  }, [rows]);

  const filtered = useMemo(
    () => (rows || []).filter((r) => !country || r.countryCode === country),
    [rows, country]
  );
  const podium = filtered.slice(0, 3);
  const rest = filtered.slice(3);
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const pageRows = rest.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const topScore = filtered[0]?.solvedCount || 1;

  const myRow = rows?.find((r) => r.userId === user?.id);
  const totalSolved = (rows || []).reduce((sum, r) => sum + r.solvedCount, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div
        className="relative overflow-hidden rounded-2xl px-6 sm:px-10 py-8 sm:py-10 mb-8"
        style={{ background: "linear-gradient(135deg, #13B9FD 0%, #0553B1 100%)" }}
      >
        <div className="absolute -right-10 -top-16 w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
        <div className="absolute right-24 -bottom-24 w-56 h-56 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
              <Trophy size={30} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Leaderboard</h1>
              <p className="text-sm text-white/80 mt-1">Ranked by total problems solved, across the whole platform.</p>
            </div>
          </div>
          {countries.length > 0 && (
            <label className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white" style={{ background: "rgba(255,255,255,0.18)" }}>
              <Globe2 size={16} />
              <select
                value={country}
                onChange={(e) => { setCountry(e.target.value); setPage(0); }}
                className="bg-transparent outline-none cursor-pointer font-medium"
              >
                <option value="" style={{ color: "#18181b" }}>All countries</option>
                {countries.map((c) => (
                  <option key={c} value={c} style={{ color: "#18181b" }}>{countryName(c)}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {rows && rows.length > 0 && (
          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3 mt-7">
            <StatChip icon={Users} label="Participants" value={rows.length} />
            <StatChip icon={CheckCircle2} label="Problems solved" value={totalSolved} />
            <StatChip icon={Trophy} label="Your rank" value={myRow ? `#${myRow.rank}` : "—"} />
          </div>
        )}
      </div>

      {rows === null ? (
        <div className="flex justify-center py-16"><Loader2 size={26} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm" style={{ color: "var(--text-secondary)" }}>
          {rows.length === 0 ? "No one has solved a problem yet." : "No one from this country has solved a problem yet."}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 sm:gap-5 items-end mb-8">
            {/* visual order 2nd, 1st, 3rd; row order is the data's true rank order */}
            {[podium[1], podium[0], podium[2]].map((row, i) =>
              row ? (
                <PodiumCard key={row.userId} row={row} place={[2, 1, 3][i]} isMe={row.userId === user?.id} />
              ) : (
                <div key={i} />
              )
            )}
          </div>

          {rest.length > 0 && (
            <>
              <div className="card overflow-hidden">
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {pageRows.map((r) => {
                    const isMe = r.userId === user?.id;
                    return (
                      <div
                        key={r.userId}
                        className="flex items-center gap-4 px-5 sm:px-6 py-4"
                        style={{ background: isMe ? "var(--accent-soft)" : "transparent" }}
                      >
                        <div className="w-12 flex-shrink-0 text-center font-mono font-bold text-base" style={{ color: "var(--text-muted)" }}>
                          #{r.rank}
                        </div>
                        <Avatar name={r.name || r.username} size={46} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[15px] font-semibold truncate flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                            {r.name || r.username || "someone"}
                            {isMe && (
                              <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "var(--accent)", color: "white" }}>you</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                            {r.username && <span className="truncate">@{r.username}</span>}
                            {r.countryCode && (
                              <span className="flex items-center gap-1.5 flex-shrink-0">
                                <Flag code={r.countryCode} height={12} />
                                <span className="hidden sm:inline">{countryName(r.countryCode)}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="hidden sm:block w-40 flex-shrink-0">
                          <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.max(6, (r.solvedCount / topScore) * 100)}%`,
                                background: "linear-gradient(90deg, #13B9FD 0%, #0553B1 100%)",
                              }}
                            />
                          </div>
                        </div>
                        <div
                          className="flex-shrink-0 min-w-[3.25rem] text-center px-3 py-1.5 rounded-full text-base font-bold"
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
                <div className="flex items-center justify-center gap-1 mt-5">
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
        </>
      )}
    </div>
  );
}
