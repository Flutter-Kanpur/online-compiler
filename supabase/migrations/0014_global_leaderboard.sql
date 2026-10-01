-- Global leaderboard — platform-wide ranking by total problems solved.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0013.
--
-- Mirrors contest_leaderboard/get_contest_leaderboard (0003_contests.sql)
-- exactly: a plain view does the aggregation, a security-definer function
-- wraps it, because a bare select against the view would otherwise inherit
-- solved_problems' RLS (auth.uid() = user_id) and silently return only the
-- caller's own row to anyone who queries it directly.
--
-- Ranking logic is identical to my_rank()'s (0001_init.sql) — rank() over
-- (order by count(*) desc) grouped by user_id from solved_problems — so a
-- user's position here always agrees with the "#N" already shown on their
-- own Profile page. Someone with zero solved problems has no row in
-- solved_problems and so never appears, matching Profile's existing "—"
-- fallback for the same reason.

create view public.global_leaderboard as
select
  sp.user_id,
  p.username,
  p.name,
  count(*)::int as solved_count,
  rank() over (order by count(*) desc) as rank
from public.solved_problems sp
join public.profiles p on p.id = sp.user_id
group by sp.user_id, p.username, p.name;

create function public.get_global_leaderboard(p_limit integer default 100)
returns setof public.global_leaderboard
language sql
stable
security definer
set search_path = public
as $$
  select * from public.global_leaderboard order by rank asc limit p_limit;
$$;
