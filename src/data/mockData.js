// Mock data for the UI demo. No backend / no persistence.

export const MOCK_USER = {
  id: "u_001",
  name: "Hari Om",
  username: "hariomgh",
  email: "hari.om@example.com",
  avatar: null,
  joinedAt: "2025-08-14",
  role: "user",
  bio: "Software engineer · DSA enthusiast · building at Flutter Kanpur.",
  location: "Kanpur, India",
  github: "hariomgh",
};

export const MOCK_ADMIN = {
  id: "a_001",
  name: "Admin",
  username: "admin",
  email: "admin@spark.dev",
  role: "admin",
};

// ----- mock stats -----
export const MOCK_STATS = {
  solved: { easy: 18, medium: 11, hard: 3, total: 32 },
  totalSubmissions: 84,
  acceptanceRate: 0.62,
  currentStreak: 7,
  maxStreak: 14,
  rank: 4283,
};

// ----- mock recent submissions -----
export const MOCK_SUBMISSIONS = [
  { id: "s_1", problemId: "two-sum", problemTitle: "two sum", language: "python", verdict: "AC", runtime: 42, memory: 14320, submittedAt: hoursAgo(2) },
  { id: "s_2", problemId: "fizzbuzz", problemTitle: "fizzbuzz", language: "cpp", verdict: "AC", runtime: 8, memory: 3840, submittedAt: hoursAgo(5) },
  { id: "s_3", problemId: "palindrome", problemTitle: "is it a palindrome?", language: "python", verdict: "WA", runtime: 38, memory: 14210, submittedAt: hoursAgo(9) },
  { id: "s_4", problemId: "factorial", problemTitle: "factorial", language: "java", verdict: "TLE", runtime: 2000, memory: 25600, submittedAt: hoursAgo(26) },
  { id: "s_5", problemId: "factorial", problemTitle: "factorial", language: "java", verdict: "AC", runtime: 105, memory: 24180, submittedAt: hoursAgo(28) },
  { id: "s_6", problemId: "max-of-three", problemTitle: "biggest of three", language: "javascript", verdict: "AC", runtime: 65, memory: 11200, submittedAt: hoursAgo(48) },
  { id: "s_7", problemId: "reverse-string", problemTitle: "flip a string", language: "python", verdict: "AC", runtime: 30, memory: 14080, submittedAt: hoursAgo(72) },
  { id: "s_8", problemId: "fibonacci", problemTitle: "fibonacci", language: "cpp", verdict: "AC", runtime: 5, memory: 3720, submittedAt: hoursAgo(96) },
];

// ----- mock heatmap (last 90 days) -----
// 0 = no submissions, 1-4 = activity tiers
export const MOCK_HEATMAP = generateHeatmap(90);

function hoursAgo(h) {
  const d = new Date();
  d.setHours(d.getHours() - h);
  return d.toISOString();
}

function generateHeatmap(days) {
  const out = [];
  const today = new Date();
  // Seeded PRNG so the demo is stable across reloads
  let seed = 17;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const r = rand();
    let level = 0;
    if (r > 0.35) level = 1;
    if (r > 0.55) level = 2;
    if (r > 0.75) level = 3;
    if (r > 0.9) level = 4;
    out.push({ date: d.toISOString().slice(0, 10), level });
  }
  return out;
}

// ----- mock admin problem library (problems uploaded via admin) -----
export const MOCK_ADMIN_PROBLEMS = [
  { id: "two-sum", title: "two sum", difficulty: "easy", tags: ["arrays", "hash-table"], submissions: 1284, acceptance: 0.71, createdAt: "2025-09-02" },
  { id: "valid-parentheses", title: "valid parentheses", difficulty: "easy", tags: ["stack", "strings"], submissions: 942, acceptance: 0.58, createdAt: "2025-09-05" },
  { id: "merge-sorted", title: "merge two sorted lists", difficulty: "medium", tags: ["linked-list", "recursion"], submissions: 510, acceptance: 0.49, createdAt: "2025-09-12" },
  { id: "max-subarray", title: "max subarray sum", difficulty: "medium", tags: ["arrays", "dp"], submissions: 822, acceptance: 0.45, createdAt: "2025-09-20" },
  { id: "binary-search", title: "binary search", difficulty: "easy", tags: ["arrays", "binary-search"], submissions: 1612, acceptance: 0.66, createdAt: "2025-10-01" },
  { id: "word-ladder", title: "word ladder", difficulty: "hard", tags: ["bfs", "graphs", "strings"], submissions: 187, acceptance: 0.22, createdAt: "2025-10-14" },
];

export const MOCK_ADMIN_STATS = {
  totalProblems: 124,
  totalUsers: 8412,
  submissionsToday: 1289,
  activeUsers: 312,
  newUsersThisWeek: 184,
  problemsThisWeek: 7,
};

export const MOCK_RECENT_ACTIVITY = [
  { id: "a1", type: "upload", actor: "admin", target: "binary-search", at: hoursAgo(1) },
  { id: "a2", type: "submission", actor: "deepak_k", target: "two-sum", verdict: "AC", at: hoursAgo(2) },
  { id: "a3", type: "submission", actor: "ananya_r", target: "max-subarray", verdict: "WA", at: hoursAgo(3) },
  { id: "a4", type: "upload", actor: "admin", target: "word-ladder", at: hoursAgo(6) },
  { id: "a5", type: "signup", actor: "rohit_m", at: hoursAgo(9) },
  { id: "a6", type: "submission", actor: "priya_s", target: "merge-sorted", verdict: "AC", at: hoursAgo(11) },
];

export function formatRelativeTime(iso) {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.floor((now - then) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
