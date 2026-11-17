-- PlsSize.Me database schema (Supabase / Postgres).
-- Run in the Supabase SQL editor. Safe to re-run.

-- Anonymous, opt-in community measurements. Column names match the original 2024 table.
create table if not exists public.visitor_data (
  "visitorId"     text primary key,
  unit            text check (unit in ('cm', 'in')),
  "erectLength"   numeric,
  "erectGirth"    numeric,
  "flaccidLength" numeric,
  "flaccidGirth"  numeric,
  country         text,          -- legacy, no longer written
  note            text,          -- legacy, no longer written
  "visitCount"    integer default 1,
  timestamp       timestamptz default now()
);

alter table public.visitor_data enable row level security;

-- The site has no accounts, so the anon role needs read/insert/update/delete.
drop policy if exists "anon read"   on public.visitor_data;
drop policy if exists "anon insert" on public.visitor_data;
drop policy if exists "anon update" on public.visitor_data;
drop policy if exists "anon delete" on public.visitor_data;
create policy "anon read"   on public.visitor_data for select to anon using (true);
create policy "anon insert" on public.visitor_data for insert to anon with check (true);
create policy "anon update" on public.visitor_data for update to anon using (true) with check (true);
create policy "anon delete" on public.visitor_data for delete to anon using (true);

-- Trade-off: because there are no accounts, anyone with the anon key can read all rows (including
-- visitor IDs) and modify any row. The site never displays IDs, and the data is anonymous, but if you
-- need stronger guarantees move writes behind a Supabase Edge Function that owns the service key.

-- Anonymous survey responses: insert-only for the public.
create table if not exists public.survey_responses (
  id            bigint generated always as identity primary key,
  submitted_at  timestamptz not null default now(),
  response      jsonb not null check (pg_column_size(response) < 8192)
);

alter table public.survey_responses enable row level security;
drop policy if exists "anon insert" on public.survey_responses;
create policy "anon insert" on public.survey_responses for insert to anon with check (true);
