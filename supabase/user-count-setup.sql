-- Run this once in Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Sets up a public, read-only count of registered users for the live
-- counter on the site header. auth.users itself is never exposed —
-- this only tracks id + signup timestamp in a separate public table.

-- 1. Public table that mirrors auth.users signups (id + timestamp only).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 2. Trigger: insert a row here whenever a new user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, created_at)
  values (new.id, new.created_at)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Backfill existing users who signed up before this trigger existed,
--    so the count is accurate from day one, not just going forward.
insert into public.profiles (id, created_at)
select id, created_at from auth.users
on conflict (id) do nothing;

-- 4. RLS: allow anyone to read id + created_at (no email, no PII) so the
--    anon key can count rows and subscribe to inserts. Nothing else on
--    this table is sensitive.
alter table public.profiles enable row level security;

drop policy if exists "Public can read profiles for count" on public.profiles;
create policy "Public can read profiles for count"
  on public.profiles for select
  using (true);

-- 5. Required for the live-ticking part: add profiles to the realtime
--    publication so inserts push out over Supabase Realtime.
alter publication supabase_realtime add table public.profiles;
