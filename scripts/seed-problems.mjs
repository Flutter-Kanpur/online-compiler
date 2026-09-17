// One-time seed: loads the hand-written problems from src/problems.js into
// the Supabase `problems` table. Safe to re-run — it upserts by id.
//
// Needs the SERVICE ROLE key (not the anon key) since it writes regardless
// of the "admins only" RLS policy — this only ever runs on your machine,
// never in the browser.
//
// Usage:
//   SUPABASE_URL=https://xxx.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=xxx \
//   node scripts/seed-problems.mjs

import { createClient } from "@supabase/supabase-js";
import { PROBLEMS } from "../src/problems.js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Missing env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
    "(Supabase dashboard → Project Settings → API → service_role secret)."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey);

const rows = PROBLEMS.map((p) => ({
  id: p.id,
  title: p.title,
  vibe: p.vibe || null,
  difficulty: p.difficulty,
  tags: p.tags || [],
  statement: p.statement,
  examples: p.examples || [],
  tests: p.tests || [],
  starter: p.starter || {},
  source_url: p.sourceUrl || null,
}));

const { data, error } = await supabase.from("problems").upsert(rows).select("id");

if (error) {
  console.error("Seed failed:", error.message);
  process.exit(1);
}

console.log(`Seeded ${data.length} problems: ${data.map((r) => r.id).join(", ")}`);
