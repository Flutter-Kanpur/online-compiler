-- Fixes handle_new_user() so a colliding derived username no longer
-- crashes the entire sign-up with a raw "duplicate key value violates
-- unique constraint profiles_username_key" 500 error.
--
-- How to apply: Supabase project → SQL Editor → paste this whole file → Run.
-- Safe to run once, after 0001-0005.
--
-- Root cause: the trigger falls back to the email's local part
-- (split_part(new.email, '@', 1)) as the username when no username is
-- supplied by the provider. If that happens to already be taken by an
-- existing profile (e.g. an admin account created with a manually-set
-- username that happens to match another user's email prefix, or the same
-- person signing in with a different email/provider), the insert fails
-- and the whole OAuth/email sign-up dies — this was observed for a Google
-- sign-in whose email prefix collided with an existing admin's username.
--
-- Fix: on a collision, keep appending a numeric suffix until the username
-- is free, instead of failing outright.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate_username text;
  suffix int := 0;
begin
  base_username := coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1));
  candidate_username := base_username;

  while exists (select 1 from public.profiles where username = candidate_username) loop
    suffix := suffix + 1;
    candidate_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, name)
  values (
    new.id,
    candidate_username,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email)
  );
  return new;
end;
$$;
