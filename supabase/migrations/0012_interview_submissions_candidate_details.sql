-- Additional candidate details for interview submissions.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0011.
--
-- Mirrors candidate_name/candidate_email (0007/0011) — denormalized onto
-- every interview_submissions row for the same reason: submission history
-- must outlive the interview_rooms row it came from. No interview_rooms
-- migration needed — these live in that table's existing `state` jsonb
-- column exactly like candidateName/candidateEmail already do.

alter table public.interview_submissions
  add column candidate_college text,
  add column candidate_year text,
  add column candidate_branch text,
  add column candidate_phone text;
