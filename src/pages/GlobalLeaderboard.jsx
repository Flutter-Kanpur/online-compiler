import React, { useState, useEffect, useMemo } from "react";
import { Trophy, Loader2, ChevronLeft, ChevronRight, Crown, Users, CheckCircle2, Globe2, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth.jsx";
import { fetchGlobalLeaderboard } from "../lib/db.js";

const PAGE_SIZE = 10;

const CSS = `
@keyframes lb-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
@keyframes lb-float { 0%, 100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-18px) scale(1.06); } }
@keyframes lb-rise { from { opacity: 0; transform: translateY(28px) scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes lb-slide { from { opacity: 0; transform: translateX(-24px); } to { opacity: 1; transform: none; } }
@keyframes lb-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes lb-bounce { 0%, 100% { transform: translate(-50%, 0) rotate(-6deg); } 50% { transform: translate(-50%, -7px) rotate(6deg); } }
@keyframes lb-glow { 0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.55), 0 10px 30px rgba(251,191,36,0.25); } 50% { box-shadow: 0 0 0 10px rgba(251,191,36,0), 0 14px 40px rgba(251,191,36,0.45); } }
@keyframes lb-shine { 0% { transform: translateX(-120%) skewX(-20deg); } 60%, 100% { transform: translateX(260%) skewX(-20deg); } }
@keyframes lb-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.08); } 100% { transform: scale(1); opacity: 1; } }
.lb-hero { background-size: 300% 300%; animation: lb-gradient 12s ease infinite; }
.lb-blob { animation: lb-float 7s ease-in-out infinite; }
.lb-rise { opacity: 0; animation: lb-rise 0.7s cubic-bezier(.2,.8,.2,1) forwards; }
.lb-slide { opacity: 0; animation: lb-slide 0.5s cubic-bezier(.2,.8,.2,1) forwards; }
.lb-bar { transform-origin: left; animation: lb-grow 1s cubic-bezier(.2,.8,.2,1) both; }
.lb-crown { animation: lb-bounce 2.2s ease-in-out infinite; }
.lb-glow { animation: lb-glow 2.4s ease-in-out infinite; }
.lb-pop { animation: lb-pop 0.5s cubic-bezier(.2,.8,.2,1) both; }
.lb-shine::after { content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent); animation: lb-shine 3.6s ease-in-out infinite; pointer-events: none; }
.lb-podium { transition: transform .25s ease, box-shadow .25s ease; }
.lb-podium:hover { transform: translateY(-8px); box-shadow: 0 18px 40px rgba(5,83,177,0.22); }
.lb-row { position: relative; transition: transform .2s ease, box-shadow .2s ease, background .2s ease; }
.lb-row:hover { transform: translateX(6px) scale(1.005); box-shadow: 0 8px 24px rgba(99,102,241,0.18); z-index: 1; }
@media (prefers-reduced-motion: reduce) {
  .lb-hero, .lb-blob, .lb-rise, .lb-slide, .lb-bar, .lb-crown, .lb-glow, .lb-pop, .lb-shine::after { animation: none !important; opacity: 1 !important; transform: none; }
}
`;

const AVATAR_GRADIENTS = [
  "linear-gradient(135deg, #6366f1, #8b5cf6)",
  "linear-gradient(135deg, #ec4899, #f43f5e)",
  "linear-gradient(135deg, #f59e0b, #ef4444)",
  "linear-gradient(135deg, #10b981, #0ea5e9)",
  "linear-gradient(135deg, #06b6d4, #3b82f6)",
  "linear-gradient(135deg, #8b5cf6, #ec4899)",
  "linear-gradient(135deg, #84cc16, #10b981)",
  "linear-gradient(135deg, #f97316, #eab308)",
];
function gradientFor(seed = "") {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

// Duplicated locally (like Profile.jsx) — App.jsx imports this page, so
// importing Avatar back from App.jsx would be circular.
function Avatar({ name, seed, size = 44, ring }) {
  const initials = (name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: gradientFor(seed || name),
        boxShadow: ring ? `0 0 0 3px white, 0 0 0 6px ${ring}` : "0 2px 6px rgba(0,0,0,0.15)",
      }}
    >
      {initials}
    </div>
  );
}

function CountUp({ value, prefix = "", duration = 1000 }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(value); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      setN(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{prefix}{n}</>;
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
      style={{ height, width: height * 1.4, boxShadow: "0 0 0 1px rgba(0,0,0,0.1)" }}
    />
  );
}

const MEDALS = {
  1: { grad: "linear-gradient(180deg, #fde68a 0%, #fffbeb 60%, #ffffff 100%)", ring: "#f59e0b", color: "#b45309" },
  2: { grad: "linear-gradient(180deg, #cbd5e1 0%, #f1f5f9 60%, #ffffff 100%)", ring: "#94a3b8", color: "#475569" },
  3: { grad: "linear-gradient(180deg, #fdba74 0%, #ffedd5 60%, #ffffff 100%)", ring: "#f97316", color: "#c2410c" },
};

const RANK_ACCENTS = ["#13B9FD", "#6366f1", "#a855f7", "#ec4899", "#f59e0b", "#10b981"];

function StatChip({ icon: Icon, label, children, tint, delay }) {
  return (
    <div
      className="lb-rise flex items-center gap-3 rounded-xl px-4 py-3"
      style={{ background: "rgba(255,255,255,0.18)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.25)", animationDelay: `${delay}ms` }}
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ background: tint }}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <div className="text-2xl font-extrabold text-white leading-tight">{children}</div>
        <div className="text-[11px] uppercase tracking-wider text-white/80">{label}</div>
      </div>
    </div>
  );
}

function PodiumCard({ row, place, isMe, delay }) {
  const medal = MEDALS[place];
  const first = place === 1;
  return (
    <div
      className={`lb-rise lb-podium card relative overflow-hidden flex flex-col items-center text-center px-3 sm:px-5 pb-6 ${first ? "pt-9 lb-glow" : "pt-7 mt-6 sm:mt-12"}`}
      style={{ borderColor: medal.ring, borderWidth: 2, background: isMe ? "var(--accent-soft)" : medal.grad, animationDelay: `${delay}ms` }}
    >
      {first && <div className="lb-shine absolute inset-0 overflow-hidden pointer-events-none" />}
      {first && (
        <Crown size={32} className="lb-crown absolute top-1 left-1/2" style={{ color: "#f59e0b", fill: "#fbbf24", filter: "drop-shadow(0 2px 4px rgba(245,158,11,0.5))" }} />
      )}
      <div className="absolute top-2 left-3 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full text-white shadow" style={{ background: medal.ring }}>
        #{row.rank}
      </div>
      <div className="mt-2">
        <Avatar name={row.name || row.username} seed={row.userId} size={first ? 84 : 64} ring={medal.ring} />
      </div>
      <div className="mt-4 text-sm sm:text-base font-bold truncate max-w-full" style={{ color: "var(--text-primary)" }}>
        {row.name || row.username || "someone"}
      </div>
      {row.username && <div className="text-xs truncate max-w-full" style={{ color: "var(--text-muted)" }}>@{row.username}</div>}
      {row.countryCode && (
        <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full text-xs bg-white/70" style={{ color: "var(--text-secondary)" }}>
          <Flag code={row.countryCode} />
          <span className="truncate">{countryName(row.countryCode)}</span>
        </div>
      )}
      <div className="mt-4 leading-none">
        <span className="text-4xl sm:text-5xl font-black" style={{ color: medal.color }}>
          <CountUp value={row.solvedCount} />
        </span>
        <div className="text-[11px] uppercase tracking-wider mt-1.5 font-semibold" style={{ color: medal.color }}>solved</div>
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

  const filtered = useMemo(() => (rows || []).filter((r) => !country || r.countryCode === country), [rows, country]);
  const podium = filtered.slice(0, 3);
  const rest = filtered.slice(3);
  const totalPages = Math.max(1, Math.ceil(rest.length / PAGE_SIZE));
  const pageRows = rest.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const topScore = filtered[0]?.solvedCount || 1;

  const myRow = rows?.find((r) => r.userId === user?.id);
  const totalSolved = (rows || []).reduce((sum, r) => sum + r.solvedCount, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <style>{CSS}</style>

      <div
        className="lb-hero relative overflow-hidden rounded-3xl px-6 sm:px-10 py-8 sm:py-10 mb-8 shadow-xl"
        style={{ backgroundImage: "linear-gradient(120deg, #0ea5e9, #6366f1, #a855f7, #ec4899, #6366f1, #0ea5e9)" }}
      >
        <div className="lb-blob absolute -right-10 -top-16 w-64 h-64 rounded-full" style={{ background: "rgba(255,255,255,0.14)" }} />
        <div className="lb-blob absolute right-32 -bottom-24 w-56 h-56 rounded-full" style={{ background: "rgba(251,191,36,0.22)", animationDelay: "-3s" }} />
        <div className="lb-blob absolute left-1/3 -top-20 w-40 h-40 rounded-full" style={{ background: "rgba(16,185,129,0.22)", animationDelay: "-5s" }} />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="lb-pop w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: "linear-gradient(135deg, #fbbf24, #f97316)" }}>
              <Trophy size={34} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-2">
                Leaderboard <Sparkles size={22} className="text-yellow-200" />
              </h1>
              <p className="text-sm text-white/85 mt-1">Ranked by total problems solved, across the whole platform.</p>
            </div>
          </div>
          {countries.length > 0 && (
            <label className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white shadow" style={{ background: "rgba(255,255,255,0.22)", border: "1px solid rgba(255,255,255,0.3)" }}>
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
            <StatChip icon={Users} label="Participants" tint="linear-gradient(135deg, #10b981, #0ea5e9)" delay={150}>
              <CountUp value={rows.length} />
            </StatChip>
            <StatChip icon={CheckCircle2} label="Problems solved" tint="linear-gradient(135deg, #f59e0b, #ef4444)" delay={280}>
              <CountUp value={totalSolved} />
            </StatChip>
            <StatChip icon={Trophy} label="Your rank" tint="linear-gradient(135deg, #8b5cf6, #ec4899)" delay={410}>
              {myRow ? <CountUp value={myRow.rank} prefix="#" /> : "—"}
            </StatChip>
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
          <div key={country} className="grid grid-cols-3 gap-3 sm:gap-5 items-end mb-8">
            {/* visual order 2nd, 1st, 3rd; row order is the data's true rank order */}
            {[podium[1], podium[0], podium[2]].map((row, i) =>
              row ? (
                <PodiumCard key={row.userId} row={row} place={[2, 1, 3][i]} isMe={row.userId === user?.id} delay={[200, 0, 350][i]} />
              ) : (
                <div key={i} />
              )
            )}
          </div>

          {rest.length > 0 && (
            <>
              <div key={`${country}-${page}`} className="space-y-3">
                {pageRows.map((r, i) => {
                  const isMe = r.userId === user?.id;
                  const accent = RANK_ACCENTS[(r.rank - 1) % RANK_ACCENTS.length];
                  return (
                    <div
                      key={r.userId}
                      className="lb-slide lb-row card flex items-center gap-4 pl-5 pr-5 sm:pr-6 py-4 overflow-hidden"
                      style={{ background: isMe ? "var(--accent-soft)" : "white", animationDelay: `${i * 60}ms`, borderLeft: `5px solid ${accent}` }}
                    >
                      <div
                        className="w-11 h-11 flex-shrink-0 rounded-xl flex items-center justify-center font-mono font-extrabold text-sm text-white shadow"
                        style={{ background: accent }}
                      >
                        #{r.rank}
                      </div>
                      <Avatar name={r.name || r.username} seed={r.userId} size={46} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[15px] font-semibold truncate flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                          {r.name || r.username || "someone"}
                          {isMe && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: "var(--accent)", color: "white" }}>you</span>}
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
                      <div className="hidden sm:block w-44 flex-shrink-0">
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div
                            className="lb-bar h-full rounded-full"
                            style={{
                              width: `${Math.max(6, (r.solvedCount / topScore) * 100)}%`,
                              background: `linear-gradient(90deg, ${accent}, #ec4899)`,
                              animationDelay: `${i * 60 + 250}ms`,
                            }}
                          />
                        </div>
                      </div>
                      <div
                        className="flex-shrink-0 min-w-[3.5rem] text-center px-3 py-1.5 rounded-full text-base font-extrabold text-white shadow"
                        style={{ background: `linear-gradient(135deg, ${accent}, #6366f1)` }}
                      >
                        {r.solvedCount}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1.5 mt-6">
                  <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="btn-ghost !px-2 !py-1.5 disabled:opacity-40">
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className="w-9 h-9 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5"
                      style={{
                        background: i === page ? "linear-gradient(135deg, #13B9FD, #6366f1)" : "transparent",
                        color: i === page ? "white" : "var(--text-secondary)",
                        boxShadow: i === page ? "0 4px 12px rgba(99,102,241,0.4)" : undefined,
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} className="btn-ghost !px-2 !py-1.5 disabled:opacity-40">
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
