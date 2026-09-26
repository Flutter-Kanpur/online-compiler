-- Candidate email + AI-generated-code detection cache for interview submissions.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0010.
--
-- candidate_email mirrors candidate_name (already a top-level denormalized
-- column on this table, see 0007_interview_submissions.sql) for the same
-- reason: submission history must outlive the interview_rooms row it came
-- from. No interview_rooms migration is needed — candidateEmail lives in
-- that table's existing `state` jsonb column exactly like candidateName
-- already does.
--
-- ai_score/ai_reasoning/ai_checked_at cache the result of an admin-triggered,
-- on-demand Claude call (server/index.js POST .../check-ai) so re-opening
-- History later shows the cached verdict without re-paying for a re-check.

alter table public.interview_submissions
  add column candidate_email text,
  add column ai_score int,
  add column ai_reasoning text,
  add column ai_checked_at timestamptz;

alter table public.interview_submissions
  add constraint interview_submissions_ai_score_range
  check (ai_score is null or (ai_score between 0 and 100));
