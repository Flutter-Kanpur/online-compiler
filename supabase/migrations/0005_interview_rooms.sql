-- Interview room persistence.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0004.
--
-- Backs server/index.js's interview relay so restarting/redeploying that
-- process (e.g. a free host sleeping after ~15 min idle) no longer wipes
-- live interview rooms. The in-memory Map in server/index.js stays the
-- hot-path cache; this table is the durable backup it reads from on
-- boot/cache-miss and writes to (debounced) as candidates edit.

create table public.interview_rooms (
  id               text primary key,
  title            text not null,
  problem_ids      text[] not null default '{}',
  flutter_round    boolean not null default false,
  flutter_gist_id  text,
  flutter_prompt   text,
  webui_round      boolean not null default false,
  webui_prompt     text,
  state            jsonb not null default '{}',
  created_at       timestamptz not null default now()
);

create index interview_rooms_created_at_idx on public.interview_rooms (created_at);

-- RLS: enabled, with zero policies — intentionally, and unlike every other
-- table in this schema. problems/contests/submissions/profiles all have
-- explicit select/insert/update policies because the browser's anon/
-- authenticated client legitimately reads or writes them directly. This
-- table is different: no browser client should ever query it — only this
-- app's Node relay server (server/index.js) touches it, authenticating
-- with the service_role key, which bypasses RLS entirely regardless of
-- policies. So RLS's only job here is "deny anon/authenticated entirely,"
-- and an enabled table with zero policies already does exactly that —
-- there's nothing for a policy to grant.
alter table public.interview_rooms enable row level security;
