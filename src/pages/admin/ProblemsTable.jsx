import React, { useState } from "react";
import {
  Search, Plus, Upload, MoreHorizontal, Edit3, Trash2, Eye, X,
} from "lucide-react";
import { MOCK_ADMIN_PROBLEMS } from "../../data/mockData.js";
import { DifficultyPill } from "../ProblemsList.jsx";

export default function ProblemsTable({ onNavigate }) {
  const [search, setSearch] = useState("");
  const [problems, setProblems] = useState(MOCK_ADMIN_PROBLEMS);
  const [openMenu, setOpenMenu] = useState(null);

  const filtered = search.trim()
    ? problems.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.tags.some((t) => t.includes(search.toLowerCase()))
      )
    : problems;

  function handleDelete(id) {
    if (!confirm("Delete this problem? (UI demo — no actual delete)")) return;
    setProblems((ps) => ps.filter((p) => p.id !== id));
    setOpenMenu(null);
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

        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
              No problems found.
            </div>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {filtered.map((p) => (
              <div
                key={p.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_120px_100px_50px] gap-3 md:gap-4 px-5 py-3.5 items-center"
              >
                <div>
                  <div className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                    {p.title}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {p.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: "#f4f4f5", color: "var(--text-secondary)" }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <div><DifficultyPill difficulty={p.difficulty} /></div>
                <div className="text-right text-sm font-mono" style={{ color: "var(--text-primary)" }}>
                  {p.submissions.toLocaleString()}
                </div>
                <div className="text-right text-sm font-mono" style={{ color: "var(--text-primary)" }}>
                  {Math.round(p.acceptance * 100)}%
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {p.createdAt}
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
                        <MenuItem icon={<Eye size={13} />} onClick={() => { alert("Preview (mock)"); setOpenMenu(null); }}>View</MenuItem>
                        <MenuItem icon={<Edit3 size={13} />} onClick={() => { alert("Edit (mock)"); setOpenMenu(null); }}>Edit</MenuItem>
                        <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />
                        <MenuItem icon={<Trash2 size={13} />} onClick={() => handleDelete(p.id)} danger>Delete</MenuItem>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
        Showing {filtered.length} of {problems.length} problems (mock data).
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
