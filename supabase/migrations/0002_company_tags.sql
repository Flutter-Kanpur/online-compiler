-- Adds company tags to problems, e.g. companies = '{Amazon,Google}'.
-- Apply this the same way as 0001_init.sql: Supabase SQL Editor → paste → Run.

alter table public.problems
  add column companies text[] not null default '{}';

create index problems_companies_idx on public.problems using gin (companies);
