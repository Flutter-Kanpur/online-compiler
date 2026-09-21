// Problem catalog fetcher — reads from the real Supabase `problems` table
// (supabase/migrations/0001_init.sql). Keeps the same {ok, problems, total}
// contract the UI already expects, so App.jsx's pagination/fallback logic
// didn't need to change when this stopped being a third-party demo dataset.

import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

export const DEFAULT_PAGE_SIZE = 20;

function mapRow(row) {
  return {
    id: row.id,
    title: row.title,
    vibe: row.vibe,
    difficulty: row.difficulty,
    tags: row.tags || [],
    companies: row.companies || [],
    statement: row.statement,
    examples: row.examples || [],
    tests: row.tests || [],
    starter: row.starter || {},
    sourceUrl: row.source_url || null,
  };
}

/**
 * Fetch a page of problems from Supabase, optionally filtered by difficulty
 * and/or company — both applied server-side so pagination stays correct
 * across the whole filtered set, not just the loaded page.
 * @returns {Promise<{ok: boolean, problems: Array, total: number, error?: string}>}
 */
export async function fetchProblemsSafe({
  limit = DEFAULT_PAGE_SIZE, offset = 0, difficulty = "all", company = "all", sheet = "all",
} = {}) {
  if (!isSupabaseConfigured) {
    return { ok: false, problems: [], total: 0, error: "Supabase isn't configured yet." };
  }
  const safeLimit = Math.max(1, Math.min(100, limit));
  const safeOffset = Math.max(0, Math.floor(offset));
  try {
    let query = supabase.from("problems").select("*", { count: "exact" }).order("created_at", { ascending: true });
    if (difficulty !== "all") query = query.eq("difficulty", difficulty);
    if (company !== "all") query = query.contains("companies", [company]);
    if (sheet !== "all") query = query.contains("tags", [sheet]);
    const { data, error, count } = await query.range(safeOffset, safeOffset + safeLimit - 1);
    if (error) throw error;
    return { ok: true, problems: (data || []).map(mapRow), total: count || 0 };
  } catch (err) {
    return { ok: false, problems: [], total: 0, error: err.message || String(err) };
  }
}
