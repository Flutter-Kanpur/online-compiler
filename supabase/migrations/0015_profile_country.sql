-- Profile country + country on the global leaderboard.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0014.
--
-- country_code is an ISO 3166-1 alpha-2 code (e.g. 'IN'), detected from the
-- visitor's network by the /api/geo Vercel function the first time they sign
-- in with no country set. Existing "users can update their own profile" RLS
-- already covers writing it.
--
-- The view is recreated (not "create or replace") and the wrapper function
-- re-created because the function's return type is the view's row type.

alter table public.profiles
  add column country_code text
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

drop function public.get_global_leaderboard(integer);
drop view public.global_leaderboard;

create view public.global_leaderboard as
select
  sp.user_id,
  p.username,
  p.name,
  p.country_code,
  count(*)::int as solved_count,
  rank() over (order by count(*) desc) as rank
from public.solved_problems sp
join public.profiles p on p.id = sp.user_id
group by sp.user_id, p.username, p.name, p.country_code;

create function public.get_global_leaderboard(p_limit integer default 100)
returns setof public.global_leaderboard
language sql
stable
security definer
set search_path = public
as $$
  select * from public.global_leaderboard order by rank asc limit p_limit;
$$;
