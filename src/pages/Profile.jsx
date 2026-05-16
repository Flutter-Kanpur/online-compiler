import React from "react";
import {
  MapPin, Calendar, Code2, Mail, Flame, Trophy, TrendingUp, Check, X,
  Clock, AlertCircle, ChevronRight,
} from "lucide-react";
import {
  MOCK_STATS, MOCK_SUBMISSIONS, MOCK_HEATMAP, formatRelativeTime,
} from "../data/mockData.js";

function Avatar({ name, size = 32 }) {
  const initials = (name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="flex items-center justify-center rounded-full font-semibold text-white flex-shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
      }}
    >
      {initials}
    </div>
  );
}

export default function Profile({ user, solvedCount, onOpenProblem, problems }) {
  // Override solved count if user has actually solved something locally
  const stats = {
    ...MOCK_STATS,
    solved: { ...MOCK_STATS.solved, total: Math.max(MOCK_STATS.solved.total, solvedCount) },
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          <Avatar name={user.name} size={80} />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{user.name}</h1>
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>@{user.username}</span>
            </div>
            {user.bio && (
              <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>{user.bio}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
              {user.location && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} style={{ color: "var(--text-muted)" }} /> {user.location}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Calendar size={14} style={{ color: "var(--text-muted)" }} /> Joined {new Date(user.joinedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Mail size={14} style={{ color: "var(--text-muted)" }} /> {user.email}
              </span>
              {user.github && (
                <span className="inline-flex items-center gap-1.5">
                  <Code2 size={14} style={{ color: "var(--text-muted)" }} /> github.com/{user.github}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 px-5 py-3 rounded-lg flex-shrink-0"
               style={{ background: "var(--accent-soft)", border: "1px solid #c7d2fe" }}>
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--accent)" }}>Rank</div>
            <div className="text-2xl font-bold" style={{ color: "var(--accent)" }}>#{stats.rank.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Trophy size={18} />}
          color="#4f46e5"
          label="Solved"
          value={stats.solved.total}
          sub={`of ${problems.length + 50}`}
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          color="#059669"
          label="Acceptance"
          value={`${Math.round(stats.acceptanceRate * 100)}%`}
          sub={`${stats.totalSubmissions} subs`}
        />
        <StatCard
          icon={<Flame size={18} />}
          color="#ea580c"
          label="Current streak"
          value={`${stats.currentStreak}d`}
          sub={`max ${stats.maxStreak}d`}
        />
        <StatCard
          icon={<Clock size={18} />}
          color="#6366f1"
          label="Last submission"
          value={formatRelativeTime(MOCK_SUBMISSIONS[0].submittedAt)}
          sub={MOCK_SUBMISSIONS[0].problemTitle}
        />
      </div>

      {/* Difficulty breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-1">
          <div className="card p-5">
            <div className="text-sm font-semibold mb-4" style={{ color: "var(--text-primary)" }}>By difficulty</div>
            <DifficultyBar label="Easy" solved={stats.solved.easy} total={60} color="#10b981" />
            <DifficultyBar label="Medium" solved={stats.solved.medium} total={45} color="#f59e0b" />
            <DifficultyBar label="Hard" solved={stats.solved.hard} total={25} color="#ef4444" />
          </div>
        </div>

        {/* Heatmap */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Submission activity</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Last 90 days</div>
            </div>
            <Heatmap data={MOCK_HEATMAP} />
            <div className="flex items-center justify-end gap-2 mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
              <span>Less</span>
              {[0, 1, 2, 3, 4].map((l) => (
                <div
                  key={l}
                  className="w-3 h-3 rounded-sm"
                  style={{ background: heatColor(l) }}
                />
              ))}
              <span>More</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent submissions */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Recent submissions</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>{MOCK_SUBMISSIONS.length} recent</div>
        </div>
        <div className="divide-y" style={{ borderColor: "var(--border)" }}>
          {MOCK_SUBMISSIONS.map((s) => {
            const found = problems.find((p) => p.id === s.problemId);
            return (
              <button
                key={s.id}
                onClick={() => found && onOpenProblem(found)}
                className="w-full text-left px-5 py-3 flex items-center justify-between gap-3 transition-colors"
                onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <VerdictBadge verdict={s.verdict} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium capitalize truncate" style={{ color: "var(--text-primary)" }}>
                      {s.problemTitle}
                    </div>
                    <div className="text-xs flex items-center gap-2 mt-0.5" style={{ color: "var(--text-muted)" }}>
                      <span className="font-mono">{s.language}</span>
                      <span>·</span>
                      <span>{s.runtime}ms · {(s.memory / 1024).toFixed(1)}MB</span>
                      <span>·</span>
                      <span>{formatRelativeTime(s.submittedAt)}</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, color, label, value, sub }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
        {label} · <span>{sub}</span>
      </div>
    </div>
  );
}

function DifficultyBar({ label, solved, total, color }) {
  const pct = Math.min(100, (solved / total) * 100);
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1.5 text-xs">
        <span className="font-medium" style={{ color: "var(--text-primary)" }}>{label}</span>
        <span style={{ color: "var(--text-muted)" }}>
          <span className="font-semibold" style={{ color }}>{solved}</span>
          <span> / {total}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#f4f4f5" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function Heatmap({ data }) {
  // Group into columns of 7 (oldest first)
  const cols = [];
  for (let i = 0; i < data.length; i += 7) {
    cols.push(data.slice(i, i + 7));
  }
  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {Array.from({ length: 7 }).map((_, ri) => {
            const cell = col[ri];
            if (!cell) {
              return <div key={ri} className="w-3 h-3" />;
            }
            return (
              <div
                key={ri}
                className="w-3 h-3 rounded-sm cursor-pointer transition-transform hover:scale-125"
                style={{ background: heatColor(cell.level) }}
                title={`${cell.date}: ${cell.level} submissions`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function heatColor(level) {
  return ["#f4f4f5", "#c7d2fe", "#a5b4fc", "#818cf8", "#4f46e5"][level] || "#f4f4f5";
}

function VerdictBadge({ verdict }) {
  const config = {
    AC: { bg: "#d1fae5", text: "#047857", icon: <Check size={11} strokeWidth={3} />, label: "Accepted" },
    WA: { bg: "#fee2e2", text: "#b91c1c", icon: <X size={11} strokeWidth={3} />, label: "Wrong" },
    TLE: { bg: "#fef3c7", text: "#b45309", icon: <Clock size={11} strokeWidth={2.5} />, label: "TLE" },
    RE: { bg: "#fee2e2", text: "#b91c1c", icon: <AlertCircle size={11} strokeWidth={2.5} />, label: "RE" },
    CE: { bg: "#fee2e2", text: "#b91c1c", icon: <AlertCircle size={11} strokeWidth={2.5} />, label: "CE" },
  };
  const c = config[verdict] || config.WA;
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold flex-shrink-0"
      style={{ background: c.bg, color: c.text }}
    >
      {c.icon}
      {c.label}
    </div>
  );
}
