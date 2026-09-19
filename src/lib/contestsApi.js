// Data-access layer over the Supabase `contests` / `contest_problems` tables
// and the `contest_id`-tagged rows in `submissions` (see
// supabase/migrations/0003_contests.sql). Reuses db.js's insertSubmission /
// markSolved rather than duplicating them — a contest submission is a
// submission in every sense, just scoped to a contest.

import { supabase } from "./supabaseClient.js";
import { insertSubmission, markSolved } from "./db.js";

function mapContestRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/** "upcoming" | "live" | "ended" — purely derived from starts_at/ends_at, no stored status column. */
export function contestStatus(contest, now = new Date()) {
  const t = now.getTime();
  if (t < new Date(contest.startsAt).getTime()) return "upcoming";
  if (t > new Date(contest.endsAt).getTime()) return "ended";
  return "live";
}

export async function createContest({ title, description, startsAt, endsAt, problemIds }, userId) {
  const { data: contest, error } = await supabase
    .from("contests")
    .insert({
      title,
      description: description || null,
      starts_at: startsAt,
      ends_at: endsAt,
      created_by: userId,
    })
    .select()
    .single();
  if (error) throw error;

  const rows = problemIds.map((problemId, i) => ({
    contest_id: contest.id,
    problem_id: problemId,
    position: i,
  }));
  const { error: linkError } = await supabase.from("contest_problems").insert(rows);
  if (linkError) throw linkError;

  return mapContestRow(contest);
}

export async function fetchContests() {
  const { data, error } = await supabase
    .from("contests")
    .select("*")
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data || []).map(mapContestRow);
}

export async function fetchContest(contestId) {
  const [{ data: contestRow, error: contestError }, { data: linkRows, error: linkError }] = await Promise.all([
    supabase.from("contests").select("*").eq("id", contestId).single(),
    supabase
      .from("contest_problems")
      .select("position, points, problems(*)")
      .eq("contest_id", contestId)
      .order("position", { ascending: true }),
  ]);
  if (contestError) throw contestError;
  if (linkError) throw linkError;

  const problems = (linkRows || [])
    .filter((r) => r.problems)
    .map((r) => ({
      id: r.problems.id,
      title: r.problems.title,
      vibe: r.problems.vibe,
      difficulty: r.problems.difficulty,
      tags: r.problems.tags || [],
      companies: r.problems.companies || [],
      statement: r.problems.statement,
      examples: r.problems.examples || [],
      tests: r.problems.tests || [],
      starter: r.problems.starter || {},
      sourceUrl: r.problems.source_url || null,
      points: r.points,
    }));

  return { ...mapContestRow(contestRow), problems };
}

export async function deleteContest(contestId) {
  const { error } = await supabase.from("contests").delete().eq("id", contestId);
  if (error) throw error;
}

export async function submitContestSolution({
  userId, contestId, problemId, language, code, verdict, passed, total, timeMs, memoryKb,
}) {
  await insertSubmission({
    userId, problemId, kind: "submit", language, code, verdict, passed, total, timeMs, memoryKb, contestId,
  });
  if (verdict === "AC") {
    await markSolved(userId, problemId);
  }
}

export async function fetchContestLeaderboard(contestId) {
  const { data, error } = await supabase.rpc("get_contest_leaderboard", { p_contest_id: contestId });
  if (error) throw error;
  return (data || []).map((row) => ({
    userId: row.user_id,
    username: row.username,
    name: row.name,
    solvedCount: row.solved_count,
    totalPenalty: Number(row.total_penalty),
    rank: row.rank,
  }));
}

/** Per-problem verdict history for one user within one contest — used to mark solved/attempted tabs. */
export async function fetchMyContestSubmissions(userId, contestId) {
  const { data, error } = await supabase
    .from("submissions")
    .select("problem_id, verdict, created_at")
    .eq("user_id", userId)
    .eq("contest_id", contestId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const byProblem = {};
  for (const row of data || []) {
    const entry = (byProblem[row.problem_id] ||= { attempts: 0, solved: false });
    entry.attempts++;
    if (row.verdict === "AC") entry.solved = true;
  }
  return byProblem;
}
