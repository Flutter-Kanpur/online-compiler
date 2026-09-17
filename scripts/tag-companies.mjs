// One-time curation pass: tags existing problems with company names based on
// topic overlap between each problem's existing tags and each company's
// well-known interview topic emphasis.
//
// IMPORTANT — this is a heuristic, not scraped data: no company's actual
// question bank was used (see the earlier research on this — GitHub's
// "company-wise" LeetCode repos only redistribute titles/links, never real
// problem content, due to LeetCode's copyright). The topic profiles below
// reflect each company's broadly-known interview style. Treat the resulting
// tags as "problems in this style," not "this exact company asked this."
//
// Usage:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/tag-companies.mjs

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}
const supabase = createClient(url, serviceKey);

// Only these tags are used as differentiators — generic ones (misc, loops,
// conditions, intro, i/o) apply to nearly every problem and wouldn't
// distinguish anything.
const COMPANY_PROFILES = {
  Amazon: ["arrays", "graphs", "dp", "sorting"],
  Google: ["graphs", "dp", "math", "sorting"],
  Microsoft: ["arrays", "strings", "dp", "sorting"],
  Meta: ["arrays", "graphs", "strings", "dp"],
  Apple: ["strings", "arrays", "dp"],
  Adobe: ["dp", "math", "strings"],
  Bloomberg: ["math", "strings", "arrays"],
  Uber: ["graphs", "math", "arrays"],
  Netflix: ["dp", "arrays", "strings"],
  "Goldman Sachs": ["math", "dp", "arrays"],
  Flipkart: ["arrays", "strings", "sorting"],
  Paytm: ["arrays", "math", "strings"],
};

const MAX_COMPANIES_PER_PROBLEM = 3;

function companiesFor(tags) {
  const scored = Object.entries(COMPANY_PROFILES)
    .map(([company, profile]) => ({
      company,
      score: profile.filter((t) => tags.includes(t)).length,
    }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || a.company.localeCompare(b.company));
  return scored.slice(0, MAX_COMPANIES_PER_PROBLEM).map((s) => s.company);
}

async function main() {
  const { data: problems, error } = await supabase.from("problems").select("id, tags, difficulty");
  if (error) throw error;

  let updated = 0, skipped = 0;
  for (const p of problems) {
    if (p.difficulty === "starter") { skipped++; continue; } // too trivial to tag by company
    const companies = companiesFor(p.tags || []);
    if (companies.length === 0) { skipped++; continue; }
    const { error: updErr } = await supabase.from("problems").update({ companies }).eq("id", p.id);
    if (updErr) throw updErr;
    updated++;
  }

  console.log(`✓ Tagged ${updated} problems with companies (${skipped} skipped — starter difficulty or no topic match).`);
}

main();
