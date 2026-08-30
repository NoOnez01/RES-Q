-- Adds province + source call-center id so the app can approximate each
-- unit's location (the source dashboard gives no per-unit coordinates,
-- only a province and the call-center it belongs to) for distance sorting
-- on the rescue-unit search page.
alter table public.idem_units
  add column if not exists province text,
  add column if not exists cc_id text;

create index if not exists idem_units_province_idx on public.idem_units (province);
