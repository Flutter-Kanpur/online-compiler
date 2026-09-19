import React, { useState, useEffect, useCallback } from "react";
import { Search, X, Loader2, Shield, ShieldOff } from "lucide-react";
import { fetchAllUsers, updateUserRole } from "../../lib/db.js";
import { useAuth } from "../../lib/auth.jsx";

export default function Users() {
  const { user, profile } = useAuth();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchAllUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? users.filter((u) =>
        (u.username || "").toLowerCase().includes(search.toLowerCase()) ||
        (u.name || "").toLowerCase().includes(search.toLowerCase())
      )
    : users;

  async function handleToggleRole(u) {
    const nextRole = u.role === "admin" ? "user" : "admin";
    if (u.id === user.id && nextRole === "user") {
      if (!confirm("Remove your own admin access? You'll need another admin to restore it.")) return;
    } else if (!confirm(`${nextRole === "admin" ? "Make" : "Remove"} "${u.username || u.name}" ${nextRole === "admin" ? "an admin" : "a regular user"}?`)) {
      return;
    }
    setBusyId(u.id);
    try {
      await updateUserRole(u.id, nextRole);
      setUsers((prev) => prev.map((p) => (p.id === u.id ? { ...p, role: nextRole } : p)));
    } catch (e) {
      alert(`Failed to update role: ${e.message}`);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto fade-in">
      <div className="card p-4 mb-5 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username or name…"
            className="input-field pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-zinc-100">
              <X size={14} style={{ color: "var(--text-muted)" }} />
            </button>
          )}
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>{users.length} users</div>
      </div>

      {error && (
        <div className="mb-4 text-sm rounded-lg p-3" style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c" }}>
          Failed to load users: {error}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_120px_140px_140px] gap-4 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
             style={{ background: "#fafafa", borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
          <div>User</div>
          <div>Role</div>
          <div>Joined</div>
          <div></div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} /></div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm" style={{ color: "var(--text-secondary)" }}>No users matched your search.</div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--border)" }}>
            {filtered.map((u) => (
              <div key={u.id} className="grid grid-cols-1 md:grid-cols-[1fr_120px_140px_140px] gap-3 md:gap-4 px-5 py-3.5 items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <MiniAvatar name={u.name || u.username} />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                      {u.name || u.username || "unnamed"}
                    </div>
                    {u.username && (
                      <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>@{u.username}</div>
                    )}
                  </div>
                </div>
                <div>
                  <RoleBadge role={u.role} />
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {new Date(u.created_at).toLocaleDateString()}
                </div>
                <div>
                  <button
                    onClick={() => handleToggleRole(u)}
                    disabled={busyId === u.id}
                    className="btn-ghost text-xs !px-2 !py-1 disabled:opacity-40"
                  >
                    {busyId === u.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : u.role === "admin" ? (
                      <ShieldOff size={12} />
                    ) : (
                      <Shield size={12} />
                    )}
                    {u.role === "admin" ? "Remove admin" : "Make admin"}
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

function RoleBadge({ role }) {
  const isAdmin = role === "admin";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ background: isAdmin ? "var(--accent-soft)" : "#f4f4f5", color: isAdmin ? "var(--accent)" : "var(--text-muted)" }}
    >
      {isAdmin && <Shield size={10} />}
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}

function MiniAvatar({ name }) {
  const initials = (name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
      style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}
    >
      {initials}
    </div>
  );
}
