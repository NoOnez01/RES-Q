-- Run this in the Supabase SQL Editor. Creates the case record table and the
-- media-tracking table, plus permissive policies matching this app's current
-- no-login demo flow (tighten before handling real patient data).

create table if not exists cases (
  case_id text primary key,
  status text,
  incident_type text,
  location text,
  patient_count int,
  conscious text,
  callback_phone text,
  notes text,
  reporter_name text,
  reporter_phone text,
  created_at timestamptz,
  updated_at timestamptz default now()
);

-- No foreign key to `cases` on purpose: a photo/audio upload can happen a
-- moment before the case row's own upsert finishes, and this table must
-- never block on that race.
create table if not exists case_media (
  id bigint generated always as identity primary key,
  case_id text not null,
  media_type text not null check (media_type in ('photo', 'audio')),
  file_path text not null,
  url text not null,
  uploaded_at timestamptz not null default now()
);

create index if not exists case_media_case_id_idx on case_media (case_id);

alter table cases enable row level security;
alter table case_media enable row level security;

create policy "Public read cases" on cases for select to public using (true);
create policy "Public upsert cases" on cases for insert to public with check (true);
create policy "Public update cases" on cases for update to public using (true);

create policy "Public read case_media" on case_media for select to public using (true);
create policy "Public insert case_media" on case_media for insert to public with check (true);

-- RLS policies only govern row visibility; the anon/authenticated roles also
-- need the base table-level grant or every query fails with "permission
-- denied for table X" before RLS is even evaluated.
grant select, insert, update on cases to anon, authenticated;
grant select, insert on case_media to anon, authenticated;
