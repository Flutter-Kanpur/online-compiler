-- Reusable "template" interview links.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0009.
--
-- A template room is never itself a live 1:1 session — instead, the relay
-- server's POST /api/interviews/:roomId/fork endpoint (server/index.js)
-- clones it into a brand-new, fully independent room the moment a candidate
-- enters their name on the template's link, so one link can be shared with
-- any number of candidates without pre-generating a batch of links.

alter table public.interview_rooms
  add column is_template boolean not null default false;
