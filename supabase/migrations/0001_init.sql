-- Flutter Kanpur online compiler — initial schema.
--
-- How to apply: open your Supabase project → SQL Editor → paste this whole
-- file → Run. Safe to run once on a fresh project.
--
-- After running this, promote yourself to admin (there's no admin yet):
--   1. Sign up once through the app's normal sign-up form.
--   2. In the SQL editor:  select id, username from public.profiles;
--   3. update public.profiles set role = 'admin' where id = '<your-uuid>';

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users row, created automatically on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    text unique,
  name        text,
  bio         text,
  location    text,
  github      text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles are viewable by everyone"
  on public.profiles for select
  using (true);

create policy "users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Security-definer helper so problem-table policies can check "is this
-- caller an admin?" without running into RLS recursion on profiles.
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profile row whenever someone signs up (email/password or
-- Google — both go through auth.users the same way).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email)
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- problems — the catalog. Readable by everyone, writable only by admins.
-- ---------------------------------------------------------------------------
create table public.problems (
  id          text primary key,
  title       text not null,
  vibe        text,
  difficulty  text not null check (difficulty in ('starter', 'easy', 'medium', 'hard')),
  tags        text[] not null default '{}',
  statement   text not null,
  examples    jsonb not null default '[]',
  tests       jsonb not null default '[]',
  starter     jsonb not null default '{}',
  source_url  text,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

alter table public.problems enable row level security;

create policy "problems are viewable by everyone"
  on public.problems for select
  using (true);

create policy "admins can insert problems"
  on public.problems for insert
  with check (public.is_admin());

create policy "admins can update problems"
  on public.problems for update
  using (public.is_admin());

create policy "admins can delete problems"
  on public.problems for delete
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- submissions — every Run/Submit attempt, so Profile/Dashboard can compute
-- real stats instead of using mock numbers.
-- ---------------------------------------------------------------------------
create table public.submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  problem_id  text not null references public.problems(id) on delete cascade,
  kind        text not null check (kind in ('run', 'submit')),
  language    text not null,
  code        text not null,
  verdict     text not null,
  passed      int,
  total       int,
  time_ms     numeric,
  memory_kb   numeric,
  created_at  timestamptz not null default now()
);

create index submissions_user_id_idx on public.submissions (user_id, created_at desc);
create index submissions_problem_id_idx on public.submissions (problem_id);
create index submissions_created_at_idx on public.submissions (created_at desc);

alter table public.submissions enable row level security;

create policy "users can view their own submissions"
  on public.submissions for select
  using (auth.uid() = user_id);

create policy "admins can view all submissions"
  on public.submissions for select
  using (public.is_admin());

create policy "users can insert their own submissions"
  on public.submissions for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- solved_problems — fast "did this user solve this problem" lookups.
-- ---------------------------------------------------------------------------
create table public.solved_problems (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  problem_id  text not null references public.problems(id) on delete cascade,
  solved_at   timestamptz not null default now(),
  primary key (user_id, problem_id)
);

alter table public.solved_problems enable row level security;

create policy "users can view their own solved problems"
  on public.solved_problems for select
  using (auth.uid() = user_id);

create policy "users can insert their own solved problems"
  on public.solved_problems for insert
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- my_rank() — the caller's leaderboard position by solved-problem count.
-- security definer because computing this needs to see everyone's solved
-- counts, not just the caller's own rows (which is all solved_problems' RLS
-- normally allows) — it only ever returns a single integer, never other
-- users' data, so this doesn't leak anything solved_problems' RLS protects.
-- ---------------------------------------------------------------------------
create function public.my_rank()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select rnk::int from (
    select user_id, rank() over (order by count(*) desc) as rnk
    from public.solved_problems
    group by user_id
  ) ranked
  where ranked.user_id = auth.uid();
$$;
