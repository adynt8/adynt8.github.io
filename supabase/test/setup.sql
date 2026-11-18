-- Local check of schema.sql against a legacy-shaped table. Usage:
--   psql -f supabase/test/setup.sql && psql -d t -f supabase/schema.sql && psql -d t -f supabase/test/checks.sql
-- Every statement under a "must fail" heading should print an ERROR; the rest should succeed.
drop database if exists t; create database t;
\c t
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
grant usage on schema public to anon, authenticated;
-- Legacy-style table: no PK on visitorId, float columns, text timestamp, wide-open grants.
create table public.visitor_data (id bigserial primary key, "visitorId" text, unit text, "erectLength" float8, "erectGirth" float8, "flaccidLength" float8, "flaccidGirth" float8, country text, note text, "visitCount" int, timestamp text);
grant all on public.visitor_data to anon; grant usage on sequence visitor_data_id_seq to anon;
alter table visitor_data enable row level security;
create policy "Enable all" on visitor_data for all to anon using (true) with check (true);
insert into visitor_data ("visitorId", unit, "erectLength", "erectGirth", "visitCount", timestamp) values
 ('vabc123def', 'in', 6, 5, 3, '2024-09-01T10:00:00.000Z'), ('vonlyvisit1', null, null, null, 1, '2024-09-02T10:00:00.000Z');
