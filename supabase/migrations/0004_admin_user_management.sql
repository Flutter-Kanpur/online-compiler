-- Lets admins manage other users' roles from the admin panel.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0003.
--
-- profiles already has "users can update their own profile" (self only).
-- This adds a second, admin-only policy alongside it — Postgres combines
-- multiple permissive policies for the same command with OR, so either
-- condition is enough to allow the update. Same is_admin() pattern already
-- used for problems/contests.
create policy "admins can update any profile"
  on public.profiles for update
  using (public.is_admin());
