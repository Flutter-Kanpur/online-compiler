import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, Check, CircleDot, Shuffle, Loader2 } from "lucide-react";
import { fetchSheetProblems, SHEET_TAGS } from "../../lib/db.js";
import { DifficultyPill } from "../ProblemsList.jsx";

// Day-number -> topic title. Only entries for days actually present in the
// data are ever shown; a day tag without an entry here just falls back to
// "Day N" so newly-imported batches never look broken while this map lags.
const DAY_TITLES = {
  1: "Arrays",
  2: "Arrays Part-II",
  3: "Arrays Part-III",
  4: "Arrays Part-IV / Hashing",
  5: "Linked List",
  6: "Linked List Part-II",
  7: "Two Pointers",
  8: "Greedy",
  9: "Recursion",
  10: "Recursion & Backtracking",
  11: "Binary Search",
  12: "Bit Manipulation",
  13: "Stack & Queue",
  14: "Stack & Queue Part-II",
  15: "Strings",
  16: "Strings Part-II",
  17: "Binary Tree",
  18: "Binary Tree Part-II",
  19: "Binary Tree Part-III",
  20: "Binary Search Tree",
  21: "Binary Search Tree Part-II",
  22: "Graph",
  23: "Graph Part-II",
  24: "Dynamic Programming",
  25: "Dynamic Programming Part-II",
  26: "Trie",
  27: "Miscellaneous",
};

const SHEET_DESCRIPTIONS = {
  "striver-sde-sheet":
    "Hand-picked coding interview questions across core Data Structures & Algorithms topics — the questions most frequently asked at companies like Google, Amazon, Microsoft, and Flipkart.",
};

function dayNumberOf(tags) {
  for (const t of tags || []) {
    const m = /^day-(\d+)$/.exec(t);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}

export default function SheetDetail({ sheetTag, solved, onOpen, onBack }) {
  const [problems, setProblems] = useState(null); // null = loading
  const [error, setError] = useState(null);
  const [openDays, setOpenDays] = useState(() => new Set([1]));

  useEffect(() => {
    let cancelled = false;
    setProblems(null);
    setError(null);
    fetchSheetProblems(sheetTag)
      .then((list) => { if (!cancelled) setProblems(list); })
      .catch((e) => { if (!cancelled) setError(e.message || String(e)); });
    return () => { cancelled = true; };
  }, [sheetTag]);

  const days = useMemo(() => {
    if (!problems) return [];
    const byDay = new Map();
    for (const p of problems) {
      const d = dayNumberOf(p.tags);
      if (!byDay.has(d)) byDay.set(d, []);
      byDay.get(d).push(p);
    }
    return [...byDay.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([day, list]) => ({
        day,
        title: day ? DAY_TITLES[day] || `Day ${day}` : "Uncategorized",
        problems: list,
      }));
  }, [problems]);

  const total = problems?.length || 0;
  const solvedCount = problems ? problems.filter((p) => solved.has(p.id)).length : 0;

  function toggleDay(day) {
    setOpenDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  function pickRandom() {
    if (!problems || problems.length === 0) return;
    const unsolved = problems.filter((p) => !solved.has(p.id));
    const pool = unsolved.length > 0 ? unsolved : problems;
    onOpen(pool[Math.floor(Math.random() * pool.length)]);
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium mb-6"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft size={15} /> Back to problems
      </button>

      <div className="card p-6 mb-6 flex flex-col md:flex-row md:items-center gap-6 justify-between">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {SHEET_TAGS[sheetTag] || sheetTag}
          </h1>
          <p className="mt-2 text-sm leading-relaxed max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            {SHEET_DESCRIPTIONS[sheetTag] || "A curated problem sheet."}
          </p>
          <button
            onClick={pickRandom}
            disabled={!problems || problems.length === 0}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "var(--accent)", color: "white" }}
          >
            <Shuffle size={13} /> Pick a random unsolved problem
          </button>
        </div>
        <ProgressRing solved={solvedCount} total={total} />
      </div>

      {error && (
        <div className="card p-4 mb-6 text-sm" style={{ color: "#b91c1c" }}>
          Couldn't load this sheet: {error}
        </div>
      )}

      {problems === null && !error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 size={22} className="animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {days.map(({ day, title, problems: list }) => {
            const daySolved = list.filter((p) => solved.has(p.id)).length;
            const isOpen = openDays.has(day);
            return (
              <div key={day} className="card overflow-hidden">
                <button
                  onClick={() => toggleDay(day)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {title}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                      {daySolved} / {list.length}
                    </span>
                    {isOpen ? (
                      <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />
                    ) : (
                      <ChevronRight size={16} style={{ color: "var(--text-muted)" }} />
                    )}
                  </div>
                </button>
                {isOpen && (
                  <div className="divide-y" style={{ borderTop: "1px solid var(--border)", borderColor: "var(--border)" }}>
                    {list.map((p) => {
                      const isSolved = solved.has(p.id);
                      return (
                        <button
                          key={p.id}
                          onClick={() => onOpen(p)}
                          className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left transition-colors"
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isSolved ? (
                              <div
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ background: "#d1fae5" }}
                              >
                                <Check size={11} color="#059669" strokeWidth={3} />
                              </div>
                            ) : (
                              <CircleDot
                                size={16}
                                style={{ color: "var(--text-muted)" }}
                                strokeWidth={1.5}
                                className="flex-shrink-0"
                              />
                            )}
                            <span
                              className="text-sm font-medium capitalize truncate"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {p.title}
                            </span>
                          </div>
                          <DifficultyPill difficulty={p.difficulty} small />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgressRing({ solved, total }) {
  const pct = total > 0 ? solved / total : 0;
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  return (
    <div className="relative flex-shrink-0" style={{ width: 100, height: 100 }}>
      <svg viewBox="0 0 100 100" width="100" height="100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#f4f4f5" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="8"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>{solved}</span>
        <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>/ {total}</span>
      </div>
    </div>
  );
}
