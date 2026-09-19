import React, { useState, useEffect, useCallback } from "react";
import { Trophy, X, Loader2, Users2 } from "lucide-react";
import { fetchAllProblems } from "../../lib/db.js";
import { useAuth } from "../../lib/auth.jsx";
import { createContest, fetchContests, deleteContest, contestStatus } from "../../lib/contestsApi.js";

function toInputValue(date) {
  // datetime-local wants "YYYY-MM-DDTHH:MM" in local time, no timezone.
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function Contests() {
  const { user } = useAuth();
  const [problems, setProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [selected, setSelected] = useState(new Set());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState(() => toInputValue(new Date(Date.now() + 10 * 60 * 1000)));
  const [endsAt, setEndsAt] = useState(() => toInputValue(new Date(Date.now() + 100 * 60 * 1000)));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [created, setCreated] = useState(false);

  const [contests, setContests] = useState([]);
  const [listLoading, setListLoading] = useState(true);

  useEffect(() => {
    fetchAllProblems().then(setProblems).catch(() => {}).finally(() => setProblemsLoading(false));
  }, []);

  const refresh = useCallback(() => {
    fetchContests()
      .then((list) => setContests(list))
      .catch(() => {})
      .finally(() => setListLoading(false));
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [refresh]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function validate() {
    if (selected.size === 0) return "Pick at least one problem.";
    if (!title.trim()) return "Title is required.";
    const s = new Date(startsAt);
    const e = new Date(endsAt);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return "Start and end time are required.";
    if (e <= s) return "End time must be after start time.";
    return null;
  }

  async function handleCreate() {
    const err = validate();
    if (err) {
      setCreateError(err);
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await createContest(
        {
          title: title.trim(),
          description: description.trim() || null,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          problemIds: [...selected],
        },
        user.id
      );
      setSelected(new Set());
      setTitle("");
      setDescription("");
      setCreated(true);
      setTimeout(() => setCreated(false), 1800);
      refresh();
    } catch (e) {
      setCreateError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this contest? This can't be undone.")) return;
    await deleteContest(id).catch(() => {});
    refresh();
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="card p-5">
        <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>New weekly contest</div>
        <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>
          Pick problems and a fixed start/end window. Problems lock the moment the window closes —
          ranked by problems solved, then total time + a 5-minute penalty per wrong submission.
        </p>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Contest title — e.g. Weekly Contest 12"
          className="input-field mb-3"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="input-field mb-4"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <label className="block">
            <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Starts at</div>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="input-field"
            />
          </label>
          <label className="block">
            <div className="text-xs font-semibold mb-1" style={{ color: "var(--text-secondary)" }}>Ends at</div>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="input-field"
            />
          </label>
        </div>

        {problemsLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
        ) : problems.length === 0 ? (
          <div className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            No problems yet — add some from Content → Problems first.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 max-h-72 overflow-y-auto pr-1">
            {problems.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer"
                style={{
                  background: selected.has(p.id) ? "var(--accent-soft)" : "#fafafa",
                  border: "1px solid " + (selected.has(p.id) ? "var(--accent)" : "var(--border)"),
                }}
              >
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                <span className="capitalize flex-1" style={{ color: "var(--text-primary)" }}>{p.title}</span>
                <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-muted)" }}>{p.difficulty}</span>
              </label>
            ))}
          </div>
        )}

        {createError && <div className="text-xs mb-3" style={{ color: "#b91c1c" }}>{createError}</div>}
        {created && <div className="text-xs mb-3" style={{ color: "#047857" }}>Contest created.</div>}

        <button className="btn-primary" disabled={creating} onClick={handleCreate}>
          <Trophy size={14} />
          {creating ? "Creating…" : `Create contest (${selected.size} problem${selected.size === 1 ? "" : "s"})`}
        </button>
      </div>

      <div className="card p-5">
        <div className="text-sm font-semibold mb-3" style={{ color: "var(--text-primary)" }}>Contests</div>
        {listLoading ? (
          <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
        ) : contests.length === 0 ? (
          <div className="text-sm py-6 text-center" style={{ color: "var(--text-muted)" }}>No contests yet.</div>
        ) : (
          <div className="space-y-2">
            {contests.map((c) => (
              <div key={c.id} className="rounded-lg p-3 flex items-center justify-between gap-3" style={{ border: "1px solid var(--border)" }}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {c.title}
                    <StatusPill status={contestStatus(c)} />
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {new Date(c.startsAt).toLocaleString()} → {new Date(c.endsAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="btn-ghost text-xs !px-2 !py-1"
                    title="Leaderboard (open from the Contests tab as a signed-in user)"
                  >
                    <Users2 size={12} /> Standings
                  </a>
                  <button onClick={() => handleDelete(c.id)} className="btn-ghost text-xs !px-2 !py-1" title="Delete contest">
                    <X size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function StatusPill({ status }) {
  const palette = {
    upcoming: { bg: "#f4f4f5", text: "var(--text-muted)", dot: "#a1a1aa", label: "upcoming" },
    live: { bg: "#ecfdf5", text: "#047857", dot: "#10b981", label: "live" },
    ended: { bg: "#f4f4f5", text: "var(--text-muted)", dot: "#71717a", label: "ended" },
  };
  const p = palette[status] || palette.upcoming;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: p.bg, color: p.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.dot }} />
      {p.label}
    </span>
  );
}
