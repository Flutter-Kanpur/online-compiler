-- Interview time limits.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0007.
--
-- Adds an optional per-interview time limit, set by the interviewer at
-- room-creation time (src/pages/admin/Interviews.jsx). Deliberately NOT
-- added here: a column for when the candidate's countdown actually starts.
-- That moment (state.testStartedAt) lives inside the existing `state` jsonb
-- blob instead — server/index.js's stateForPersist/roomToRow/rowToRoom
-- already round-trip that column verbatim, the same way candidateName does,
-- so it flows through the existing WS "snapshot" message for free instead
-- of needing new persistence plumbing. time_limit_minutes IS a new
-- top-level column because it's static creation-time config (like
-- flutter_round/webui_round), known before the candidate ever joins.

alter table public.interview_rooms
  add column time_limit_minutes int;
