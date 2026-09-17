import React, { useState, useEffect, useCallback } from "react";
import {
  Search, Plus, Upload, MoreHorizontal, Trash2, X, Loader2,
} from "lucide-react";
import { fetchAllProblems, deleteProblem, fetchProblemStats } from "../../lib/db.js";
import { DifficultyPill, CompanyBadges } from "../ProblemsList.jsx";

export default function ProblemsTable({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [problems, setProblems] = useState([]);
  const [problemStats, setProblemStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchAllProblems(), fetchProblemStats()])
      .then(([probs, stats]) => { setProblems(probs); setProblemStats(stats); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? problems.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
      )
    : problems;

  async function handleDelete(id) {
    if (!confirm(`Delete "${id}"? This can't be undone.`)) return;
    setOpenMenu(null);
    try {
      await deleteProblem(id);
      setProblems((ps) => ps.filter((p) => p.id !== id));
    } catch (e) {
      alert(`Failed to delete: ${e.message}`);
    }
  }

  return (
    <div className="max-w-6xl mx-auto fade-in">
      {/* Toolbar */}
      <div className="card p-4 mb-5 flex flex-col md:flex-row md:items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or tag…"
            className="input-field pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-100">
              <X size={14} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onNavigate("bulk")} className="btn-secondary">
            <Upload size={14} /> Bulk upload
          </button>
          <button onClick={() => onNavigate("add")} className="btn-primary">
            <Plus size={14} /> Add problem
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm rounded-lg p-3" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
          Failed to load problems: {error}
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div
          className="hidden md:grid grid-cols-[1fr_120px_140px_120px_100px_50px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
          style={{ background: "#fafafa", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}
        >
          <div>Problem</div>
          <div>Difficulty</div>
          <div className="text-right">Submissions</div>
          <div className="text-right">Acceptance</div>
          <div>Created</div>
          <div></div>
        </div>

        {loading ? (
          <div className="px-5 py-16 flex justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No problems found.
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {filtered.map((p) => {
              const stat = problemStats[p.id] || { submissions: 0, accepted: 0 };
              const acceptance = stat.submissions > 0 ? stat.accepted / stat.submissions : 0;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_120px_100px_50px] gap-3 md:gap-4 px-5 py-3.5 items-center"
                >
                  <div>
                    <div className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                      {p.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-1 mt-1.5">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                          style={{ background: "#f4f4f5", color: "var(--text-secondary)" }}
                        >
                          {t}
                        </span>
                      ))}
                      {p.companies?.length > 0 && <CompanyBadges companies={p.companies} max={4} />}
                    </div>
                  </div>
                  <div><DifficultyPill difficulty={p.difficulty} /></div>
                  <div className="text-right text-sm font-mono" style={{ color: "var(--text-primary)" }}>
                    {stat.submissions.toLocaleString()}
                  </div>
                  <div className="text-right text-sm font-mono" style={{ color: "var(--text-primary)" }}>
                    {stat.submissions > 0 ? `${Math.round(acceptance * 100)}%` : "—"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                  </div>
                  <div className="relative flex justify-end">
                    <button
                      onClick={() => setOpenMenu(openMenu === p.id ? null : p.id)}
                      className="p-1.5 rounded-md hover:bg-zinc-100 transition-colors"
                    >
                      <MoreHorizontal size={16} style={{ color: "var(--text-muted)" }} />
                    </button>
                    {openMenu === p.id && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setOpenMenu(null)} />
                        <div
                          className="absolute right-0 top-full mt-1 w-40 z-40 rounded-lg py-1 fade-in"
                          style={{
                            background: "white",
                            border: "1px solid var(--border)",
                            boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                          }}
                        >
                          <MenuItem icon={<Trash2 size={13} />} onClick={() => handleDelete(p.id)} danger>Delete</MenuItem>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
        Showing {filtered.length} of {problems.length} problems.
      </div>
    </div>
  );
}

function MenuItem({ children, icon, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-1.5 flex items-center gap-2 text-sm transition-colors text-left"
      style={{ color: danger ? "#dc2626" : "var(--text-primary)" }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? "#fef2f2" : "#fafafa")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <span style={{ color: danger ? "#dc2626" : "var(--text-muted)" }}>{icon}</span>
      {children}
    </button>
  );
}
