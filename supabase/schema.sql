-- PlsSize.Me database schema (Supabase / Postgres).
-- Run the whole file in the Supabase SQL editor. Safe to re-run; existing rows are never modified.
--
-- Design: the site has no accounts, so the public ("anon") key must not be able to read or write
-- tables directly. Instead it may only call the functions below, which validate their input.
-- A visitor's random ID works like a password for their own row and is never listed anywhere.

-- ---------------------------------------------------------------------------------------------
-- Community measurements
-- ---------------------------------------------------------------------------------------------

-- Column names match the original 2024 table.
create table if not exists public.visitor_data (
  "visitorId"     text primary key,
  unit            text,
  "erectLength"   numeric,
  "erectGirth"    numeric,
  "flaccidLength" numeric,
  "flaccidGirth"  numeric,
  country         text,          -- legacy, no longer written
  note            text,          -- legacy, no longer written
  "visitCount"    integer default 1,
  timestamp       timestamptz default now()
);

-- Lock the table: row-level security on, every existing policy removed, direct grants revoked.
alter table public.visitor_data enable row level security;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'visitor_data' loop
    execute format('drop policy %I on public.visitor_data', p.policyname);
  end loop;
end $$;

revoke all on public.visitor_data from anon, authenticated;

-- Shared validation: IDs are 8–40 letters/digits (covers IDs issued by the 2024 site).
create or replace function public.plssize_valid_id(p_id text) returns boolean
language sql immutable as $$
  select p_id is not null and p_id ~ '^[A-Za-z0-9]{8,40}$';
$$;

-- Insert or update one visitor's measurements. Values are centimetres; out-of-range values are rejected.
create or replace function public.submit_measurements(
  p_visitor        text,
  p_erect_length   numeric default null,
  p_erect_girth    numeric default null,
  p_flaccid_length numeric default null,
  p_flaccid_girth  numeric default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not plssize_valid_id(p_visitor) then
    raise exception 'invalid visitor id' using errcode = '22023';
  end if;
  if coalesce(p_erect_length, p_erect_girth, p_flaccid_length, p_flaccid_girth) is null then
    raise exception 'no measurements supplied' using errcode = '22023';
  end if;
  if (p_erect_length   is not null and p_erect_length   not between 4 and 30)
  or (p_erect_girth    is not null and p_erect_girth    not between 5 and 22)
  or (p_flaccid_length is not null and p_flaccid_length not between 2 and 22)
  or (p_flaccid_girth  is not null and p_flaccid_girth  not between 4 and 20) then
    raise exception 'measurement out of range' using errcode = '22023';
  end if;

  -- Update-then-insert rather than ON CONFLICT, so this also works if the original table
  -- was created without a unique constraint on "visitorId".
  update visitor_data set
    unit            = 'cm',
    "erectLength"   = round(p_erect_length, 2),
    "erectGirth"    = round(p_erect_girth, 2),
    "flaccidLength" = round(p_flaccid_length, 2),
    "flaccidGirth"  = round(p_flaccid_girth, 2),
    "visitCount"    = coalesce("visitCount", 0) + 1,
    timestamp       = now()
  where "visitorId" = p_visitor;

  if not found then
    insert into visitor_data ("visitorId", unit, "erectLength", "erectGirth", "flaccidLength", "flaccidGirth", "visitCount", timestamp)
    values (p_visitor, 'cm', round(p_erect_length, 2), round(p_erect_girth, 2), round(p_flaccid_length, 2), round(p_flaccid_girth, 2), 1, now());
  end if;
end $$;

-- Delete one visitor's row. Knowing the ID is the only credential.
create or replace function public.delete_measurements(p_visitor text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not plssize_valid_id(p_visitor) then
    raise exception 'invalid visitor id' using errcode = '22023';
  end if;
  delete from visitor_data where "visitorId" = p_visitor;
end $$;

-- Read back one visitor's own row (also used by share links created by the 2024 site).
create or replace function public.get_measurements(p_visitor text)
returns table (unit text, "erectLength" numeric, "erectGirth" numeric, "flaccidLength" numeric, "flaccidGirth" numeric, "timestamp" text)
language sql stable security definer set search_path = public as $$
  select v.unit::text, v."erectLength"::numeric, v."erectGirth"::numeric, v."flaccidLength"::numeric, v."flaccidGirth"::numeric, v.timestamp::text
  from visitor_data v
  where plssize_valid_id(p_visitor) and v."visitorId" = p_visitor;
$$;

-- What the community page may see: measurements only. No IDs and no visit counts.
create or replace view public.community_measurements as
  select unit, "erectLength", "erectGirth", "flaccidLength", "flaccidGirth", timestamp
  from public.visitor_data
  where coalesce("erectLength", "erectGirth", "flaccidLength", "flaccidGirth") is not null;

revoke all on public.community_measurements from anon, authenticated;
grant select on public.community_measurements to anon;

-- ---------------------------------------------------------------------------------------------
-- Question of the week
-- ---------------------------------------------------------------------------------------------

create table if not exists public.poll_votes (
  poll_id    text        not null,
  voter      text        not null,
  choice     smallint    not null check (choice between 0 and 9),
  created_at timestamptz not null default now(),
  primary key (poll_id, voter)
);

alter table public.poll_votes enable row level security;
revoke all on public.poll_votes from anon, authenticated;

-- Vote counts for one question.
create or replace function public.poll_results(p_poll text)
returns table (choice smallint, votes bigint)
language sql stable security definer set search_path = public as $$
  select v.choice, count(*) from poll_votes v where v.poll_id = p_poll group by v.choice order by v.choice;
$$;

-- Cast (or change) a vote, then return the updated counts. One vote per visitor per question.
create or replace function public.cast_vote(p_poll text, p_voter text, p_choice integer)
returns table (choice smallint, votes bigint)
language plpgsql security definer set search_path = public as $$
begin
  if p_poll is null or p_poll !~ '^q[0-9]{1,3}$' or not plssize_valid_id(p_voter) or p_choice is null or p_choice not between 0 and 9 then
    raise exception 'invalid vote' using errcode = '22023';
  end if;
  insert into poll_votes (poll_id, voter, choice) values (p_poll, p_voter, p_choice)
  on conflict (poll_id, voter) do update set choice = excluded.choice, created_at = now();
  return query select * from poll_results(p_poll);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Survey: the public may add a response but never read them.
-- ---------------------------------------------------------------------------------------------

create table if not exists public.survey_responses (
  id            bigint generated always as identity primary key,
  submitted_at  timestamptz not null default now(),
  response      jsonb not null check (pg_column_size(response) < 8192)
);

alter table public.survey_responses enable row level security;
revoke all on public.survey_responses from anon, authenticated;
grant insert on public.survey_responses to anon;
drop policy if exists "anon insert" on public.survey_responses;
create policy "anon insert" on public.survey_responses for insert to anon with check (true);

-- ---------------------------------------------------------------------------------------------
-- Function permissions: nothing is callable by default; the public key gets exactly these.
-- ---------------------------------------------------------------------------------------------

revoke execute on function
  public.submit_measurements(text, numeric, numeric, numeric, numeric),
  public.delete_measurements(text),
  public.get_measurements(text),
  public.poll_results(text),
  public.cast_vote(text, text, integer)
from public;

grant execute on function
  public.submit_measurements(text, numeric, numeric, numeric, numeric),
  public.delete_measurements(text),
  public.get_measurements(text),
  public.poll_results(text),
  public.cast_vote(text, text, integer)
to anon;

-- Ask the API layer to pick up the new functions and view immediately.
notify pgrst, 'reload schema';
