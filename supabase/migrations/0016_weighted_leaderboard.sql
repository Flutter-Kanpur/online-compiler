-- Weighted global ranking: score instead of raw solved count.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0015.
--
-- Score = sum over solved problems of (difficulty points x attempt multiplier)
--         + topic-breadth bonus.
--
--   difficulty points   starter 5, easy 10, medium 25, hard 50
--   attempt multiplier  greatest(0.5, 1.1 - 0.1 * wrong_attempts)
--                       wrong_attempts = Submit presses with verdict WA/TLE/RE
--                       before the first AC. Compile errors and Run presses
--                       never count. First-try AC = 1.1x, floor 0.5x.
--                       A solve with no submission history counts as first try.
--   topic bonus         5 points per distinct topic solved, capped at 15 topics.
--                       Topic = a problem tag, excluding 'misc', sheet tags and
--                       'day-N'; 'dp' and 'graphs' fold into 'dynamic-programming'
--                       and 'graph'.
--
-- Ties on score break by solved_count, then share a rank. my_rank() is
-- repointed at the same view so Profile and the leaderboard always agree.

drop function public.get_global_leaderboard(integer);
drop view public.global_leaderboard;

create view public.global_leaderboard as
with first_ac as (
  select user_id, problem_id, min(created_at) as ac_at
  from public.submissions
  where kind = 'submit' and verdict = 'AC'
  group by user_id, problem_id
),
per_problem as (
  select
    sp.user_id,
    p.difficulty,
    p.tags,
    (
      select count(*)
      from public.submissions s
      where s.user_id = sp.user_id
        and s.problem_id = sp.problem_id
        and s.kind = 'submit'
        and s.verdict in ('WA', 'TLE', 'RE')
        and (fa.ac_at is null or s.created_at < fa.ac_at)
    ) as wrong
  from public.solved_problems sp
  join public.problems p on p.id = sp.problem_id
  left join first_ac fa on fa.user_id = sp.user_id and fa.problem_id = sp.problem_id
),
topics as (
  select
    pp.user_id,
    count(distinct case t when 'dp' then 'dynamic-programming' when 'graphs' then 'graph' else t end) as topic_count
  from per_problem pp, unnest(pp.tags) as t
  where t not in ('misc', 'striver-sde-sheet') and t not like 'day-%'
  group by pp.user_id
),
agg as (
  select
    pp.user_id,
    count(*)::int as solved_count,
    count(*) filter (where pp.wrong = 0)::int as first_try_count,
    coalesce(max(tp.topic_count), 0)::int as topic_count,
    round(
      sum(
        (case pp.difficulty when 'starter' then 5 when 'easy' then 10 when 'medium' then 25 else 50 end)
        * greatest(0.5, 1.1 - 0.1 * pp.wrong)
      ) + 5 * least(coalesce(max(tp.topic_count), 0), 15)
    )::int as score
  from per_problem pp
  left join topics tp on tp.user_id = pp.user_id
  group by pp.user_id
)
select
  a.user_id,
  pr.username,
  pr.name,
  pr.country_code,
  a.solved_count,
  a.first_try_count,
  a.topic_count,
  a.score,
  rank() over (order by a.score desc, a.solved_count desc) as rank
from agg a
join public.profiles pr on pr.id = a.user_id;

create function public.get_global_leaderboard(p_limit integer default 100)
returns setof public.global_leaderboard
language sql
stable
security definer
set search_path = public
as $$
  select * from public.global_leaderboard order by rank asc, solved_count desc, username limit p_limit;
$$;

create or replace function public.my_rank()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select rank::int from public.global_leaderboard where user_id = auth.uid();
$$;
