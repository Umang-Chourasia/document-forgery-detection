-- ===========================================================================
-- Phase 2 — analyses table + private document storage
--
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Idempotent, so re-running is safe.
--
-- Security model: RLS is the real boundary. The frontend holds only the
-- publishable key and every policy below reduces to auth.uid() = owner, so a
-- user cannot reach another user's row or file even by guessing a UUID.
-- ===========================================================================

create table if not exists public.analyses (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  document_name    text not null,
  document_type    text,
  status           text not null default 'PROCESSING',
  error            text,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null default now() + interval '7 days',
  original_path    text,
  heatmap_path     text,
  thumbnail_path   text,
  evidence_metrics jsonb,                     -- populated in Phase 4
  risk_level       text check (risk_level in ('LOW','MEDIUM','HIGH')),
  narrative        jsonb                      -- populated in Phase 4
);

create index if not exists analyses_user_created_idx
  on public.analyses (user_id, created_at desc);

create index if not exists analyses_expires_idx
  on public.analyses (expires_at);

-- --------------------------------------------------------------------------
-- Table privileges.
--
-- RLS decides WHICH ROWS a role may touch, but the role still needs ordinary
-- table privileges first. A table created through the SQL editor gets none by
-- default, and PostgREST then rejects every request with
--   42501 "permission denied for table analyses"
-- (this is exactly what bit us on `profiles` in Phase 1).
--
-- These are broad verbs but NOT unrestricted access: every one of them is
-- still filtered by the RLS policies below, so they only ever apply to the
-- caller's own rows.
-- --------------------------------------------------------------------------
grant select, insert, update, delete on public.analyses to authenticated;

-- --------------------------------------------------------------------------
-- Row Level Security — ownership is the only rule.
-- --------------------------------------------------------------------------
alter table public.analyses enable row level security;

drop policy if exists "analyses_select_own" on public.analyses;
create policy "analyses_select_own" on public.analyses
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "analyses_insert_own" on public.analyses;
create policy "analyses_insert_own" on public.analyses
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "analyses_update_own" on public.analyses;
create policy "analyses_update_own" on public.analyses
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "analyses_delete_own" on public.analyses;
create policy "analyses_delete_own" on public.analyses
  for delete to authenticated
  using (auth.uid() = user_id);

-- ===========================================================================
-- Private Storage bucket
--
-- public = false, so there are no public URLs at all. The app reads objects
-- through short-lived signed URLs instead.
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do update set public = false;

-- --------------------------------------------------------------------------
-- Storage policies.
--
-- Object paths are {user_id}/{analysis_id}/{file}, so the FIRST path segment
-- is the owner's UUID. storage.foldername(name) splits the path, and [1] is
-- that first segment — comparing it to auth.uid() scopes every object to its
-- owner. A user cannot read, overwrite or delete anything under another
-- user's folder.
-- --------------------------------------------------------------------------
drop policy if exists "documents_select_own" on storage.objects;
create policy "documents_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_insert_own" on storage.objects;
create policy "documents_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_update_own" on storage.objects;
create policy "documents_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents_delete_own" on storage.objects;
create policy "documents_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
