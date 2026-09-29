-- Separate candidate-facing title.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0012.
--
-- `title` (0005) has always done double duty: the admin's internal label in
-- Active interviews/History, AND the name shown to the candidate (NameGate,
-- workspace header). This splits those — candidate_title is optional and,
-- when null, every candidate-facing surface falls back to `title` exactly
-- as before, so existing rooms need no backfill.

alter table public.interview_rooms
  add column candidate_title text;
