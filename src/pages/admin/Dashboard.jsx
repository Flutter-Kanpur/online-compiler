import React, { useState, useEffect } from "react";
import {
  FileText, Users, Activity, TrendingUp, Plus, Upload, Check, X, Clock,
  UserPlus, FileUp, ArrowUpRight, Loader2,
} from "lucide-react";
import { fetchAdminStats, fetchRecentActivity } from "../../lib/db.js";
import { formatRelativeTime } from "../../utils/time.js";

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchAdminStats(), fetchRecentActivity()])
      .then(([s, a]) => { if (!cancelled) { setStats(s); setActivity(a); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  const s = stats;
  return (
    <div className="max-w-6xl mx-auto fade-in">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<FileText size={18} />}
          color="#4f46e5"
          label="Total problems"
          value={s.totalProblems}
          delta={`+${s.problemsThisWeek} this week`}
        />
        <StatCard
          icon={<Users size={18} />}
          color="#059669"
          label="Total users"
          value={s.totalUsers.toLocaleString()}
          delta={`+${s.newUsersThisWeek} this week`}
        />
        <StatCard
          icon={<Activity size={18} />}
          color="#ea580c"
          label="Submissions today"
          value={s.submissionsToday.toLocaleString()}
          delta="Live"
        />
        <StatCard
          icon={<TrendingUp size={18} />}
          color="#7c3aed"
          label="Active users"
          value={s.activeUsers}
          delta="Past 24h"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Quick actions */}
        <div className="lg:col-span-1 space-y-4">
          <div className="card p-5">
            <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Quick actions
            </div>
            <div className="space-y-2">
              <ActionCard
                icon={<Plus size={16} />}
                color="#0553B1"
                title="Add a problem"
                subtitle="Create a new problem manually."
                onClick={() => onNavigate("add")}
              />
              <ActionCard
                icon={<Upload size={16} />}
                color="#059669"
                title="Bulk upload"
                subtitle="Import many problems from a CSV file."
                onClick={() => onNavigate("bulk")}
              />
              <ActionCard
                icon={<FileText size={16} />}
                color="#0891b2"
                title="Manage problems"
                subtitle="Edit or remove existing problems."
                onClick={() => onNavigate("problems")}
              />
            </div>
          </div>

          <div className="card p-5">
            <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>
              Health
            </div>
            <HealthRow label="Judge0 sandbox" status="ok" detail="ce.judge0.com" />
            <HealthRow label="Database" status="ok" detail="Supabase" />
            <HealthRow label="Live interviews" status="ok" detail="relay server" />
          </div>
        </div>

        {/* Recent activity */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
              <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Recent activity</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Live</div>
            </div>
            {activity.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                No activity yet.
              </div>
            ) : (
            <div className="divide-y" style={{ borderColor: "var(--border)" }}>
              {activity.map((a) => (
                <ActivityRow key={a.id} activity={a} />
              ))}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, color, label, value, delta }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        <ArrowUpRight size={14} style={{ color: "var(--text-muted)" }} />
      </div>
      <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</div>
      <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
        {label}
        <span className="ml-1.5 font-medium" style={{ color }}>{delta}</span>
      </div>
    </div>
  );
}

function ActionCard({ icon, color, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors"
      style={{ border: "1px solid var(--border)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#fafafa"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{title}</div>
        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</div>
      </div>
    </button>
  );
}

function ActivityRow({ activity }) {
  let icon, color, text;
  if (activity.type === "upload") {
    icon = <FileUp size={14} />;
    color = "#4f46e5";
    text = <><b>{activity.actor}</b> uploaded <span className="font-mono text-[12px]">{activity.target}</span></>;
  } else if (activity.type === "submission") {
    const passed = activity.verdict === "AC";
    icon = passed ? <Check size={14} /> : <X size={14} />;
    color = passed ? "#059669" : "#dc2626";
    text = <><b>{activity.actor}</b> {passed ? "solved" : "attempted"} <span className="font-mono text-[12px]">{activity.target}</span></>;
  } else if (activity.type === "signup") {
    icon = <UserPlus size={14} />;
    color = "#0891b2";
    text = <><b>{activity.actor}</b> signed up</>;
  } else {
    icon = <Activity size={14} />;
    color = "#6b7280";
    text = activity.type;
  }
  return (
    <div className="px-5 py-3 flex items-center gap-3">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, color }}
      >
        {icon}
      </div>
      <div className="flex-1 text-sm" style={{ color: "var(--text-primary)" }}>{text}</div>
      <div className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
        <Clock size={11} />
        {formatRelativeTime(activity.at)}
      </div>
    </div>
  );
}

function HealthRow({ label, status, detail }) {
  const palette = {
    ok: { dot: "#10b981", text: "Operational" },
    warn: { dot: "#f59e0b", text: "Demo mode" },
    err: { dot: "#ef4444", text: "Down" },
  }[status] || { dot: "#6b7280", text: status };
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: palette.dot }} />
        <span style={{ color: "var(--text-primary)" }}>{label}</span>
      </div>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{detail}</div>
    </div>
  );
}
