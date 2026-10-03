-- LeetCode-style contest standings: one row per participant per contest
-- problem, with per-problem solve time and wrong-attempt count.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0016. Purely additive (new function only).
--
--   score           sum of points of solved problems
--   finish_seconds  time of the LAST accepted solve + 5 min per wrong Submit
--                   made before an accepted solve (wrong = WA/TLE/RE; compile
--                   errors and Run presses never count)
--   rank            score desc, then finish_seconds asc; ties share a rank
--
-- Participants are users with at least one in-window Submit in the contest.
-- Security definer for the same reason as get_contest_leaderboard: submissions'
-- RLS would otherwise limit a plain select to the caller's own rows.

create function public.get_contest_standings(p_contest_id uuid)
returns table (
  user_id uuid,
  username text,
  name text,
  country_code text,
  rank bigint,
  score int,
  finish_seconds int,
  problem_id text,
  "position" int,
  points int,
  solved boolean,
  solve_seconds int,
  wrong_count int
)
language sql
stable
security definer
set search_path = public
as $$
  with c as (
    select ct.id, ct.starts_at, ct.ends_at from public.contests ct where ct.id = p_contest_id
  ),
  vs as (
    select s.user_id as uid, s.problem_id as pid, s.verdict, s.created_at
    from public.submissions s
    join c on s.contest_id = c.id
    where s.kind = 'submit' and s.created_at between c.starts_at and c.ends_at
  ),
  participants as (select distinct vs.uid from vs),
  cp as (
    select x.problem_id as pid, x.position as pos, x.points as pts
    from public.contest_problems x where x.contest_id = p_contest_id
  ),
  first_ac as (
    select vs.uid, vs.pid, min(vs.created_at) as ac_at
    from vs where vs.verdict = 'AC' group by vs.uid, vs.pid
  ),
  cells as (
    select pa.uid, cp.pid, cp.pos, cp.pts,
      (fa.ac_at is not null) as is_solved,
      case when fa.ac_at is not null
        then extract(epoch from (fa.ac_at - (select c.starts_at from c)))::int end as solve_secs,
      (select count(*) from vs w
        where w.uid = pa.uid and w.pid = cp.pid
          and w.verdict in ('WA', 'TLE', 'RE')
          and (fa.ac_at is null or w.created_at < fa.ac_at))::int as wrong
    from participants pa
    cross join cp
    left join first_ac fa on fa.uid = pa.uid and fa.pid = cp.pid
  ),
  totals as (
    select ce.uid,
      coalesce(sum(ce.pts) filter (where ce.is_solved), 0)::int as total_score,
      case when bool_or(ce.is_solved)
        then (max(ce.solve_secs) + 300 * sum(ce.wrong) filter (where ce.is_solved))::int end as finish
    from cells ce group by ce.uid
  ),
  ranked as (
    select t.uid, t.total_score, t.finish,
      rank() over (order by t.total_score desc, t.finish asc nulls last) as rnk
    from totals t
  )
  select r.uid, pr.username, pr.name, pr.country_code, r.rnk, r.total_score, r.finish,
    ce.pid, ce.pos, ce.pts, ce.is_solved, ce.solve_secs, ce.wrong
  from ranked r
  join cells ce on ce.uid = r.uid
  join public.profiles pr on pr.id = r.uid
  order by r.rnk, r.uid, ce.pos;
$$;
