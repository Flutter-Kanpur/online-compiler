import React, { useState, useEffect } from "react";
import { Zap, User, Shield, LogOut, ChevronDown } from "lucide-react";
import { PROBLEMS as LOCAL_PROBLEMS } from "./problems.js";
import { fetchProblemsSafe, DEFAULT_PAGE_SIZE } from "./api/problemsApi.js";
import { MOCK_USER } from "./data/mockData.js";

import ProblemsList from "./pages/ProblemsList.jsx";
import ProblemPage from "./pages/ProblemPage.jsx";
import Profile from "./pages/Profile.jsx";
import AdminApp from "./pages/admin/AdminApp.jsx";

export default function App() {
  // view: { name: 'list' | 'problem' | 'profile' | 'admin', ... }
  const [view, setView] = useState({ name: "list" });
  const [solved, setSolved] = useState(new Set(["hello-world", "sum-two", "even-odd"]));
  const [menuOpen, setMenuOpen] = useState(false);

  // ----- problem catalog -----
  const [problems, setProblems] = useState(LOCAL_PROBLEMS);
  const [problemsSource, setProblemsSource] = useState("local");
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const pageSize = DEFAULT_PAGE_SIZE;
  const totalPages = totalRows > 0 ? Math.max(1, Math.ceil(totalRows / pageSize)) : 1;

  async function loadProblems(targetPage = 1) {
    const safePage = Math.max(1, Math.floor(targetPage));
    setLoading(true);
    setFetchError(null);
    const offset = (safePage - 1) * pageSize;
    const result = await fetchProblemsSafe({ limit: pageSize, offset });
    if (result.ok && result.problems.length > 0) {
      setProblems(result.problems);
      setProblemsSource("api");
      setTotalRows(result.total || 0);
      setPage(safePage);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setProblems(LOCAL_PROBLEMS);
      setProblemsSource("local");
      setTotalRows(0);
      setPage(1);
      if (!result.ok) setFetchError(result.error);
    }
    setLoading(false);
  }

  useEffect(() => { loadProblems(1); }, []);

  function go(view) {
    setView(view);
    setMenuOpen(false);
  }

  function markSolved(id) {
    setSolved((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  const isAdminView = view.name === "admin";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-app)" }}>
      {!isAdminView && (
        <Topbar
          user={MOCK_USER}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          onHome={() => go({ name: "list" })}
          onProfile={() => go({ name: "profile" })}
          onAdmin={() => go({ name: "admin", subview: "dashboard" })}
          currentView={view.name}
        />
      )}

      <main>
        {view.name === "list" && (
          <ProblemsList
            onOpen={(p) => go({ name: "problem", problem: p })}
            solved={solved}
            problems={problems}
            loading={loading}
            error={fetchError}
            source={problemsSource}
            page={page}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={pageSize}
            onGoToPage={loadProblems}
          />
        )}
        {view.name === "problem" && (
          <ProblemPage
            problem={view.problem}
            onBack={() => go({ name: "list" })}
            onSolved={markSolved}
          />
        )}
        {view.name === "profile" && (
          <Profile
            user={MOCK_USER}
            solvedCount={solved.size}
            onOpenProblem={(p) => go({ name: "problem", problem: p })}
            problems={problems}
          />
        )}
        {view.name === "admin" && (
          <AdminApp
            subview={view.subview}
            onNavigate={(sv) => go({ name: "admin", subview: sv })}
            onExit={() => go({ name: "list" })}
          />
        )}
      </main>

      {!isAdminView && (
        <footer className="mt-16 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-7xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs"
               style={{ color: "var(--text-muted)" }}>
            <div>© 2026 Spark · Online Compiler</div>
            <div>
              Powered by{" "}
              <a href="https://github.com/judge0/judge0" target="_blank" rel="noopener noreferrer"
                 className="font-medium hover:text-indigo-600" style={{ color: "var(--text-secondary)" }}>
                Judge0
              </a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
//  Topbar
// ---------------------------------------------------------------------------
function Topbar({ user, menuOpen, setMenuOpen, onHome, onProfile, onAdmin, currentView }) {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md"
      style={{
        background: "rgba(255,255,255,0.85)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <button onClick={onHome} className="flex items-center gap-2 group">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
                boxShadow: "0 2px 8px rgba(79,70,229,0.25)",
              }}
            >
              <Zap size={18} color="white" strokeWidth={2.5} fill="white" />
            </div>
            <span className="text-lg font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Spark
            </span>
          </button>

          <nav className="hidden md:flex items-center gap-1">
            <NavLink active={currentView === "list"} onClick={onHome}>Problems</NavLink>
            <NavLink active={currentView === "profile"} onClick={onProfile}>Profile</NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAdmin}
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent)",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#c7d2fe")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "transparent")}
          >
            <Shield size={14} strokeWidth={2.5} />
            Admin
          </button>

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded-lg transition-colors hover:bg-zinc-100"
            >
              <Avatar name={user.name} size={28} />
              <span className="hidden sm:inline text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {user.name}
              </span>
              <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-1 w-56 z-40 rounded-lg shadow-lg fade-in py-1"
                  style={{
                    background: "white",
                    border: "1px solid var(--border)",
                    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
                  }}
                >
                  <div className="px-3 py-2.5 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="text-sm font-semibold">{user.name}</div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</div>
                  </div>
                  <MenuItem icon={<User size={14} />} onClick={onProfile}>View profile</MenuItem>
                  <MenuItem icon={<Shield size={14} />} onClick={onAdmin}>Admin panel</MenuItem>
                  <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />
                  <MenuItem icon={<LogOut size={14} />} onClick={() => alert("Sign out (mock)")}>Sign out</MenuItem>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-secondary)",
        background: active ? "#f4f4f5" : "transparent",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#fafafa"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {children}
    </button>
  );
}

function MenuItem({ children, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full px-3 py-2 flex items-center gap-2.5 text-sm hover:bg-zinc-50 transition-colors text-left"
      style={{ color: "var(--text-primary)" }}
    >
      <span style={{ color: "var(--text-muted)" }}>{icon}</span>
      {children}
    </button>
  );
}

export function Avatar({ name, size = 32 }) {
  const initials = (name || "?")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
