-- Operational units ("หน่วยปฏิบัติการ") synced from the NDEMS Redash public
-- dashboard (see scripts/sync_idem_units.py). unit_code is the natural key
-- from the source system, used as the upsert conflict target so re-running
-- the sync updates existing units instead of duplicating them.
create extension if not exists pgcrypto;

create table if not exists public.idem_units (
  id uuid primary key default gen_random_uuid(),
  unit_code text not null,
  unit_name text,
  bls numeric,
  als numeric,
  cls numeric,
  emt_p numeric,
  aemt numeric,
  emt_i numeric,
  emt numeric,
  emt_b numeric,
  emr numeric,
  source_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint idem_units_unit_code_key unique (unit_code)
);

create index if not exists idem_units_unit_name_idx on public.idem_units (unit_name);

alter table public.idem_units enable row level security;

-- Reference data (public EMS unit directory) -- readable by the app's own
-- anon/authenticated clients for the rescue-unit search page; writes are
-- restricted to the sync script's service-role key.
create policy "idem_units_public_read"
  on public.idem_units
  for select
  using (true);

grant select on public.idem_units to anon, authenticated;

-- This project's service_role has no blanket table access -- every table
-- touched by a server-side script/function needs an explicit grant.
grant select, insert, update on public.idem_units to service_role;
