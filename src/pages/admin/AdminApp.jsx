import React from "react";
import {
  LayoutDashboard, FileText, Plus, Upload, ArrowLeft, Zap, Settings,
  Users, Database, Video,
} from "lucide-react";
import Dashboard from "./Dashboard.jsx";
import ProblemsTable from "./ProblemsTable.jsx";
import AddProblem from "./AddProblem.jsx";
import BulkUpload from "./BulkUpload.jsx";
import Interviews from "./Interviews.jsx";

export default function AdminApp({ subview = "dashboard", onNavigate, onExit }) {
  return (
    <div className="min-h-screen flex" style={{ background: "#fafafa" }}>
      <Sidebar current={subview} onNavigate={onNavigate} onExit={onExit} />
      <div className="flex-1 min-w-0">
        <TopBar subview={subview} />
        <div className="p-8">
          {subview === "dashboard" && <Dashboard onNavigate={onNavigate} />}
          {subview === "problems" && <ProblemsTable onNavigate={onNavigate} />}
          {subview === "add" && <AddProblem onDone={() => onNavigate("problems")} />}
          {subview === "bulk" && <BulkUpload onDone={() => onNavigate("problems")} />}
          {subview === "interviews" && <Interviews />}
          {subview === "users" && <ComingSoon title="Users" description="User management is not part of this UI demo." />}
          {subview === "settings" && <ComingSoon title="Settings" description="Settings panel placeholder." />}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ current, onNavigate, onExit }) {
  return (
    <aside
      className="w-60 flex-shrink-0 sticky top-0 h-screen flex flex-col"
      style={{
        background: "white",
        borderRight: "1px solid var(--border)",
      }}
    >
      <div className="px-5 py-4 flex items-center gap-2 border-b" style={{ borderColor: "var(--border)" }}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #13B9FD 0%, #0553B1 100%)",
          }}
        >
          <Zap size={18} color="white" strokeWidth={2.5} fill="white" />
        </div>
        <div>
          <div className="text-sm font-bold leading-tight" style={{ color: "var(--text-primary)" }}>Sparx</div>
          <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--accent)" }}>Admin</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <SidebarSection label="Overview" />
        <SidebarLink
          icon={<LayoutDashboard size={16} />}
          active={current === "dashboard"}
          onClick={() => onNavigate("dashboard")}
        >
          Dashboard
        </SidebarLink>

        <SidebarSection label="Content" />
        <SidebarLink
          icon={<FileText size={16} />}
          active={current === "problems"}
          onClick={() => onNavigate("problems")}
        >
          Problems
        </SidebarLink>
        <SidebarLink
          icon={<Plus size={16} />}
          active={current === "add"}
          onClick={() => onNavigate("add")}
        >
          Add problem
        </SidebarLink>
        <SidebarLink
          icon={<Upload size={16} />}
          active={current === "bulk"}
          onClick={() => onNavigate("bulk")}
        >
          Bulk upload
        </SidebarLink>

        <SidebarSection label="Interviews" />
        <SidebarLink
          icon={<Video size={16} />}
          active={current === "interviews"}
          onClick={() => onNavigate("interviews")}
        >
          Live interviews
        </SidebarLink>

        <SidebarSection label="Workspace" />
        <SidebarLink
          icon={<Users size={16} />}
          active={current === "users"}
          onClick={() => onNavigate("users")}
        >
          Users
        </SidebarLink>
        <SidebarLink
          icon={<Settings size={16} />}
          active={current === "settings"}
          onClick={() => onNavigate("settings")}
        >
          Settings
        </SidebarLink>
      </nav>

      <div className="px-3 py-3 border-t" style={{ borderColor: "var(--border)" }}>
        <button
          onClick={onExit}
          className="w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ color: "var(--text-secondary)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ArrowLeft size={14} /> Exit to site
        </button>
      </div>
    </aside>
  );
}

function SidebarSection({ label }) {
  return (
    <div className="px-3 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
      {label}
    </div>
  );
}

function SidebarLink({ children, icon, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full inline-flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
      style={{
        background: active ? "var(--accent-soft)" : "transparent",
        color: active ? "var(--accent)" : "var(--text-secondary)",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "#fafafa"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {icon}
      {children}
    </button>
  );
}

function TopBar({ subview }) {
  const titles = {
    dashboard: { title: "Dashboard", crumb: "Overview / Dashboard" },
    problems: { title: "Problems", crumb: "Content / Problems" },
    add: { title: "Add a problem", crumb: "Content / New problem" },
    bulk: { title: "Bulk upload", crumb: "Content / Bulk upload" },
    interviews: { title: "Live interviews", crumb: "Interviews / Live interviews" },
    users: { title: "Users", crumb: "Workspace / Users" },
    settings: { title: "Settings", crumb: "Workspace / Settings" },
  };
  const t = titles[subview] || titles.dashboard;
  return (
    <header
      className="sticky top-0 z-30 px-8 h-14 flex items-center justify-between"
      style={{
        background: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
          {t.crumb}
        </div>
        <div className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
          {t.title}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md"
              style={{ background: "#f4f4f5" }}>
          <Database size={12} />
          {subview === "interviews" ? "Live interviews use the relay server" : "UI demo · no backend"}
        </span>
      </div>
    </header>
  );
}

function ComingSoon({ title, description }) {
  return (
    <div className="max-w-2xl mx-auto py-20 text-center">
      <div className="text-lg font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{title}</div>
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{description}</p>
    </div>
  );
}
