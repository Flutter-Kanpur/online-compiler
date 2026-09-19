-- Weekly Contest feature.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001_init.sql and 0002_company_tags.sql.

-- ---------------------------------------------------------------------------
-- contests — admin-created, fixed start/end window (manually created, not
-- auto-recurring).
-- ---------------------------------------------------------------------------
create table public.contests (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  constraint contests_valid_window check (ends_at > starts_at)
);

create index contests_starts_at_idx on public.contests (starts_at desc);

alter table public.contests enable row level security;

create policy "contests are viewable by everyone"
  on public.contests for select
  using (true);

create policy "admins can insert contests"
  on public.contests for insert
  with check (public.is_admin());

create policy "admins can update contests"
  on public.contests for update
  using (public.is_admin());

create policy "admins can delete contests"
  on public.contests for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- contest_problems — join table: which problems belong to a contest, in
-- what order, worth how many points. A join table (not a problem_ids
-- array) so order/points have real columns and problem_id stays FK-checked.
-- ---------------------------------------------------------------------------
create table public.contest_problems (
  contest_id  uuid not null references public.contests(id) on delete cascade,
  problem_id  text not null references public.problems(id) on delete cascade,
  position    int not null default 0,
  points      int not null default 100,
  primary key (contest_id, problem_id)
);

create index contest_problems_contest_idx on public.contest_problems (contest_id, position);

alter table public.contest_problems enable row level security;

create policy "contest problems are viewable by everyone"
  on public.contest_problems for select
  using (true);

create policy "admins can insert contest problems"
  on public.contest_problems for insert
  with check (public.is_admin());

create policy "admins can update contest problems"
  on public.contest_problems for update
  using (public.is_admin());

create policy "admins can delete contest problems"
  on public.contest_problems for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- submissions.contest_id — nullable link so a submission can be scoped to a
-- contest. NULL = ordinary practice submission (existing behavior
-- untouched). Not null = counts toward that contest's scoring/leaderboard.
-- ---------------------------------------------------------------------------
alter table public.submissions
  add column contest_id uuid references public.contests(id) on delete set null;

create index submissions_contest_idx on public.submissions (contest_id, user_id, problem_id, created_at);

-- Tighten the existing "insert own" policy so a contest-tagged submission
-- can only land while that contest's window is actually open — real
-- server-side enforcement, not just the UI disabling Run/Submit.
drop policy if exists "users can insert their own submissions" on public.submissions;

create policy "users can insert their own submissions"
  on public.submissions for insert
  with check (
    auth.uid() = user_id
    and (
      contest_id is null
      or exists (
        select 1 from public.contests c
        where c.id = contest_id and now() between c.starts_at and c.ends_at
      )
    )
  );

-- ---------------------------------------------------------------------------
-- contest_leaderboard — ICPC-style standings: solved_count desc, then
-- total_penalty asc. penalty = minutes(first AC − contest start) + 5 per
-- wrong submit before that AC. Only submissions inside [starts_at, ends_at]
-- count (defense in depth alongside the insert-policy check above).
-- ---------------------------------------------------------------------------
create view public.contest_leaderboard as
with valid_submissions as (
  select s.*
  from public.submissions s
  join public.contests c on c.id = s.contest_id
  where s.contest_id is not null
    and s.created_at between c.starts_at and c.ends_at
),
first_ac as (
  select contest_id, user_id, problem_id, min(created_at) as ac_at
  from valid_submissions
  where kind = 'submit' and verdict = 'AC'
  group by contest_id, user_id, problem_id
),
wrong_before_ac as (
  select fa.contest_id, fa.user_id, fa.problem_id, fa.ac_at,
    count(vs.id) filter (
      where vs.kind = 'submit' and vs.verdict <> 'AC' and vs.created_at < fa.ac_at
    ) as wrong_count
  from first_ac fa
  join valid_submissions vs
    on vs.contest_id = fa.contest_id and vs.user_id = fa.user_id and vs.problem_id = fa.problem_id
  group by fa.contest_id, fa.user_id, fa.problem_id, fa.ac_at
),
solved_rows as (
  select w.contest_id, w.user_id, w.problem_id,
    extract(epoch from (w.ac_at - c.starts_at)) / 60.0 + (w.wrong_count * 5) as penalty_minutes
  from wrong_before_ac w
  join public.contests c on c.id = w.contest_id
),
per_user as (
  select contest_id, user_id,
    count(*)::int as solved_count,
    coalesce(sum(penalty_minutes), 0)::numeric as total_penalty
  from solved_rows
  group by contest_id, user_id
)
select pu.contest_id, pu.user_id, p.username, p.name,
  pu.solved_count, round(pu.total_penalty, 2) as total_penalty,
  rank() over (partition by pu.contest_id order by pu.solved_count desc, pu.total_penalty asc) as rank
from per_user pu
join public.profiles p on p.id = pu.user_id;

-- security definer wrapper so any participant can read the full leaderboard
-- (submissions' RLS would otherwise restrict a bare select to the caller's
-- own row) — same justification pattern as my_rank(): it only ever returns
-- these pre-aggregated standings columns, nothing from submissions itself.
create function public.get_contest_leaderboard(p_contest_id uuid)
returns setof public.contest_leaderboard
language sql
stable
security definer
set search_path = public
as $$
  select * from public.contest_leaderboard where contest_id = p_contest_id;
$$;
