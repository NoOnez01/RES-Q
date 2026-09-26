-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New
-- query -> paste this whole file -> Run), after supabase-fix-approve-
-- permissions.sql (is_approved_dispatch_or_admin).
--
-- Road closures reported by staff -- a flooded road, a crash blocking the
-- lanes, roadworks. No free traffic API reports these for Chiang Mai, but a
-- rescue crew stuck at one knows immediately. A closure is a point; the
-- in-app A* router (src/lib/astar/) refuses the road segments next to it
-- until it's cleared or expires.

create table if not exists road_closures (
  id uuid primary key default gen_random_uuid(),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  reason text not null check (reason in ('flood', 'accident', 'construction', 'other')),
  note text check (note is null or length(note) <= 300),
  reported_by uuid not null default auth.uid() references auth.users(id) on delete set null,
  reporter_name text,
  created_at timestamptz not null default now(),
  -- Closures clear themselves: a forgotten one must not keep detouring
  -- ambulances forever. Staff can clear sooner (cleared_at).
  expires_at timestamptz not null default now() + interval '6 hours',
  cleared_at timestamptz,
  cleared_by uuid references auth.users(id) on delete set null
);
create index if not exists road_closures_active on road_closures (expires_at) where cleared_at is null;

-- Approved dispatch, rescue, or admin -- the people who may report/clear.
create or replace function is_approved_responder(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles
    where id = uid
      and approval_status = 'approved'
      and (is_admin or role in ('dispatch', 'rescue'))
  );
$$;

alter table road_closures enable row level security;

-- Everyone signed in (citizens are anonymous sessions) routes around them.
drop policy if exists "Read road closures" on road_closures;
create policy "Read road closures" on road_closures for select to authenticated using (true);

drop policy if exists "Responders report road closures" on road_closures;
create policy "Responders report road closures" on road_closures for insert to authenticated
  with check (is_approved_responder(auth.uid()) and reported_by = auth.uid() and cleared_at is null);

-- Clearing: dispatch/admin any closure, a rescue crew the ones it reported.
drop policy if exists "Responders clear road closures" on road_closures;
create policy "Responders clear road closures" on road_closures for update to authenticated
  using (is_approved_dispatch_or_admin(auth.uid()) or (reported_by = auth.uid() and is_approved_responder(auth.uid())))
  with check (is_approved_dispatch_or_admin(auth.uid()) or (reported_by = auth.uid() and is_approved_responder(auth.uid())));

grant select, insert, update on road_closures to authenticated;
revoke execute on function is_approved_responder(uuid) from public, anon;
grant execute on function is_approved_responder(uuid) to authenticated;

-- Live updates, so every open map re-routes the moment one is reported.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'road_closures'
  ) then
    alter publication supabase_realtime add table road_closures;
  end if;
end $$;
