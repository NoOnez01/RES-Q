-- Run this in the Supabase SQL Editor, any time after supabase-rescue-vehicles.sql.
-- Adds a capability tier to each vehicle (CLS = highest, ALS = middle,
-- BLS = lowest -- see VEHICLE_LEVEL_RANK in src/lib/types.ts; flip that one
-- array, not this column, if the intended ordering turns out to be
-- reversed). Every existing vehicle defaults to 'BLS', the lowest/safest
-- assumption for data that predates this column.

alter table rescue_vehicles
  add column if not exists level text not null default 'BLS'
    check (level in ('CLS', 'ALS', 'BLS'));

-- Widen case_media so a relative's drawn signature (see SignaturePad /
-- uploadCaseSignature) can be tracked the same way photos/audio already are
-- -- it's just another uploaded file's URL, not a new concept. The
-- constraint below was created unnamed in supabase-case-tables.sql, so
-- Postgres auto-named it case_media_<column>_check; if this errors because
-- your instance named it differently, find the real name with:
--   select conname from pg_constraint where conrelid = 'case_media'::regclass;
-- and substitute it below.
alter table case_media drop constraint if exists case_media_media_type_check;
alter table case_media add constraint case_media_media_type_check
  check (media_type in ('photo', 'audio', 'signature'));
