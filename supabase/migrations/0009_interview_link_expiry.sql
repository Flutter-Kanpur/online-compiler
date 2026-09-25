-- Per-interview link expiry.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0008.
--
-- Previously every interview room was hard-deleted exactly 8 hours after
-- creation, no matter what — a global constant in server/index.js
-- (ROOM_TTL_MS), unrelated to the per-candidate time_limit_minutes added in
-- 0008. That's fine for a same-day interview, but breaks a link meant to
-- stay open for candidates to join over a longer window (e.g. a week-long
-- recruiting drive) — the room, and the link, would already be gone long
-- before anyone used it. This makes that window configurable per room,
-- set by the interviewer at creation time (src/pages/admin/Interviews.jsx),
-- defaulting to the previous 8-hour behavior when left alone.

alter table public.interview_rooms
  add column expires_after_hours int not null default 8;
