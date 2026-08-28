-- Run this AFTER supabase-org-lead-system.sql. Rescue teams have been one
-- flat row = one vehicle/crew -- real rescue orgs have provincial branches
-- that each run several vehicles with different equipment. `rescue_teams`
-- keeps meaning "branch" exactly as before (dispatch still assigns cases
-- to a branch, staff accounts still belong to a branch, RLS unchanged) --
-- this just adds the vehicles that live inside one.

create table if not exists rescue_vehicles (
  id text primary key,
  rescue_team_id text not null references rescue_teams(id) on delete cascade,
  unit_code text not null,
  vehicle text not null default '',
  members int not null default 1,
  driver_name text,
  plate_number text,
  equipment text[] not null default '{}'
);

create index if not exists rescue_vehicles_team_id_idx on rescue_vehicles (rescue_team_id);

alter table rescue_vehicles enable row level security;

create policy "Public read rescue_vehicles" on rescue_vehicles for select to public using (true);

create policy "Dispatch/admin/own-branch insert rescue_vehicles" on rescue_vehicles for insert to authenticated with check (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
      and (p.is_admin or p.role = 'dispatch' or (p.role = 'rescue' and p.rescue_team_id = rescue_vehicles.rescue_team_id))
  )
);

create policy "Dispatch/admin/own-branch update rescue_vehicles" on rescue_vehicles for update to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
      and (p.is_admin or p.role = 'dispatch' or (p.role = 'rescue' and p.rescue_team_id = rescue_vehicles.rescue_team_id))
  )
);

create policy "Dispatch/admin/own-branch delete rescue_vehicles" on rescue_vehicles for delete to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
      and (p.is_admin or p.role = 'dispatch' or (p.role = 'rescue' and p.rescue_team_id = rescue_vehicles.rescue_team_id))
  )
);

grant select, insert, update, delete on rescue_vehicles to authenticated;

-- Backfill: every existing branch becomes a branch with exactly one
-- vehicle, carrying over its current flat fields -- no data lost, nothing
-- breaks for a branch that never gets a second vehicle added.
insert into rescue_vehicles (id, rescue_team_id, unit_code, vehicle, members, driver_name, plate_number, equipment)
select
  rt.id || '-v1',
  rt.id,
  rt.unit_code,
  rt.vehicle,
  rt.members,
  rt.driver_name,
  rt.plate_number,
  coalesce(rt.equipment, '{}')
from rescue_teams rt
where not exists (select 1 from rescue_vehicles rv where rv.rescue_team_id = rt.id);
