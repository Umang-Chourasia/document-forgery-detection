-- ===========================================================================
-- Phase 1 — profiles + retention consent
--
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste
-- -> Run. It is idempotent, so re-running it is safe.
--
-- Why a trigger instead of an insert from the browser:
-- consent is sent as signup metadata and copied here by a SECURITY DEFINER
-- trigger, rather than written by the client. Because `profiles` has no
-- INSERT policy and no INSERT grant, a client cannot create or forge its own
-- consent record — only this trigger can. That keeps the stored consent
-- trustworthy rather than merely client-asserted.
--
-- (It is also what makes the flow work if email confirmation is ever turned
-- back on: signUp() then returns no session, so the browser would have no
-- auth.uid() with which to insert anything.)
-- ===========================================================================

create table if not exists public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  created_at                timestamptz not null default now(),
  retention_consent_at      timestamptz,
  retention_consent_version text,
  retention_days            int not null default 7
);

-- --------------------------------------------------------------------------
-- Table privileges.
--
-- RLS decides WHICH ROWS a role may touch, but the role still needs ordinary
-- table privileges first. A table created through the SQL editor gets none by
-- default (unlike one created via the dashboard's table editor), so without
-- this grant PostgREST rejects every request with:
--   42501 "permission denied for table profiles"
--
-- No INSERT grant: rows are created solely by the SECURITY DEFINER trigger
-- below. No DELETE grant: profiles disappear via the cascade from auth.users.
-- --------------------------------------------------------------------------
grant select, update on public.profiles to authenticated;

-- --------------------------------------------------------------------------
-- Row Level Security: a user may only ever see or change their own profile.
-- --------------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Note: there is deliberately no INSERT policy. Rows are created only by the
-- trigger below, which runs as SECURITY DEFINER and therefore bypasses RLS.
-- This stops a client from fabricating a profile row with forged consent
-- metadata.

-- --------------------------------------------------------------------------
-- Copy consent metadata from the signup payload into profiles.
-- --------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    retention_consent_at,
    retention_consent_version,
    retention_days
  )
  values (
    new.id,
    coalesce(
      (new.raw_user_meta_data ->> 'retention_consent_at')::timestamptz,
      now()
    ),
    coalesce(new.raw_user_meta_data ->> 'retention_consent_version', 'v1-7day'),
    coalesce((new.raw_user_meta_data ->> 'retention_days')::int, 7)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
