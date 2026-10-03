-- Contest RSVP: a contest can require an RSVP before anyone can take part.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0017.
--
--   contests.requires_access  contest needs an RSVP (default false, so every
--                             existing contest is unchanged)
--   contests.meetup_url       optional Meetup event link shown on the RSVP screen
--   contest_rsvps             one row per RSVP. Users RSVP through rsvp_contest()
--                             (no direct insert). Admins can revoke a row, e.g.
--                             for someone who isn't on the Meetup attendee list.
--
-- Enforcement: a contest-tagged submission can only be inserted when the caller
-- has access (has_contest_access), so the UI gate can't be bypassed.

alter table public.contests
  add column meetup_url text,
  add column requires_access boolean not null default false;

create table public.contest_rsvps (
  contest_id  uuid not null references public.contests(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  revoked     boolean not null default false,
  primary key (contest_id, user_id)
);

alter table public.contest_rsvps enable row level security;

create policy "users see own rsvp, admins see all"
  on public.contest_rsvps for select
  using (auth.uid() = user_id or public.is_admin());

create policy "admins can revoke rsvps"
  on public.contest_rsvps for update
  using (public.is_admin())
  with check (public.is_admin());

create function public.has_contest_access(p_contest_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select not c.requires_access
        or public.is_admin()
        or exists (
          select 1 from public.contest_rsvps r
          where r.contest_id = c.id and r.user_id = auth.uid() and not r.revoked
        )
      from public.contests c
      where c.id = p_contest_id
    ),
    false
  );
$$;

-- Returns true if the caller now has an RSVP. A revoked RSVP stays revoked.
create function public.rsvp_contest(p_contest_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return false;
  end if;
  if not exists (
    select 1 from public.contests c
    where c.id = p_contest_id and c.requires_access and now() < c.ends_at
  ) then
    return false;
  end if;
  insert into public.contest_rsvps (contest_id, user_id)
  values (p_contest_id, auth.uid())
  on conflict do nothing;
  return exists (
    select 1 from public.contest_rsvps r
    where r.contest_id = p_contest_id and r.user_id = auth.uid() and not r.revoked
  );
end;
$$;

create function public.cancel_rsvp(p_contest_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.contest_rsvps
  where contest_id = p_contest_id and user_id = auth.uid() and not revoked;
$$;

create function public.contest_rsvp_count(p_contest_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from public.contest_rsvps where contest_id = p_contest_id and not revoked;
$$;

-- Admin-only attendee list (includes email, to cross-check against the Meetup export).
create function public.get_contest_rsvps(p_contest_id uuid)
returns table (user_id uuid, username text, name text, email text, created_at timestamptz, revoked boolean)
language sql
stable
security definer
set search_path = public
as $$
  select r.user_id, p.username, p.name, u.email::text, r.created_at, r.revoked
  from public.contest_rsvps r
  join public.profiles p on p.id = r.user_id
  join auth.users u on u.id = r.user_id
  where r.contest_id = p_contest_id and public.is_admin()
  order by r.created_at;
$$;

drop policy if exists "users can insert their own submissions" on public.submissions;

create policy "users can insert their own submissions"
  on public.submissions for insert
  with check (
    auth.uid() = user_id
    and (
      contest_id is null
      or (
        exists (
          select 1 from public.contests c
          where c.id = contest_id and now() between c.starts_at and c.ends_at
        )
        and public.has_contest_access(contest_id)
      )
    )
  );
