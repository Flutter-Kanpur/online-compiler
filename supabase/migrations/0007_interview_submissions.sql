-- Interview submission history + admin read access to interview_rooms.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0006.
--
-- Today the only way to know whether an interview candidate completed the
-- assignment is to watch the room live — a Run/Submit relayed over
-- server/index.js's WebSocket is never durably recorded anywhere.
-- interview_rooms.state holds only the latest snapshot (overwritten on
-- every edit), and that row is hard-deleted the moment "End interview" is
-- clicked or the 8h TTL sweep runs. This migration adds a permanent,
-- append-only log of real submit attempts so the admin panel can review
-- completion/results after a session has ended, not just during it.

create table public.interview_submissions (
  id              uuid primary key default gen_random_uuid(),
  -- Deliberately NOT a foreign key to interview_rooms(id) — that table's
  -- rows are hard-deleted on "End interview" and by the TTL sweep, and the
  -- whole point of this table is that submission history outlives both.
  -- room_title/candidate_name are denormalized here for the same reason:
  -- the review screen must never depend on the room row still existing.
  room_id         text not null,
  room_title      text,
  candidate_name  text,
  problem_id      text references public.problems(id) on delete set null,
  kind            text not null check (kind = 'submit'),
  language        text not null,
  code            text not null,
  verdict         text not null,
  passed          int,
  total           int,
  time_ms         numeric,
  memory_kb       numeric,
  created_at      timestamptz not null default now()
);

create index interview_submissions_room_id_idx on public.interview_submissions (room_id, created_at desc);
create index interview_submissions_problem_id_idx on public.interview_submissions (problem_id);

alter table public.interview_submissions enable row level security;

-- Only the relay server (service_role key, bypasses RLS) ever writes here —
-- no insert/update/delete policy for anon/authenticated. Admins get a
-- read-only view, same is_admin() gate every other admin-read policy in
-- this schema uses (see submissions' "admins can view all submissions").
create policy "admins can view interview submissions"
  on public.interview_submissions for select
  using (public.is_admin());

-- interview_rooms (0005_interview_rooms.sql) was created with zero RLS
-- policies on purpose, since no browser client needed to read it directly —
-- the admin's "Active interviews" list came entirely from the relay
-- server's in-memory GET /api/interviews. That's no longer sufficient: an
-- interview a candidate never submitted anything for is itself a real
-- "did not complete" signal, and it would never appear in
-- interview_submissions at all. So the review screen's history list needs
-- to read interview_rooms directly. This is a narrow, read-only relaxation —
-- insert/update/delete on interview_rooms stay completely untouched, still
-- service-role-only via the relay server.
create policy "admins can view all interview rooms"
  on public.interview_rooms for select
  using (public.is_admin());
