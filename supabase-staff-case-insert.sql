-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New
-- query -> paste this whole file -> Run), after supabase-case-fk-columns.sql.
-- Safe to run again.
--
-- Lets staff save cases. The app saves a case with an upsert (INSERT ...
-- ON CONFLICT (case_id) DO UPDATE), and Postgres checks the table's INSERT
-- policy against the row it proposes even when that row already exists and
-- the statement only updates it. The only INSERT policy was "Case insert
-- own report" (reporter_user_id = auth.uid()) -- right for a citizen's own
-- report, but it refused every save staff made to a case someone else
-- reported (1669 assessing a citizen's call, rescue or a hospital
-- updating one), and every case staff create themselves (1669 recording a
-- phone call, a rescue team logging an incident it found): "new row
-- violates row-level security policy for table cases".
--
-- So the insert check for staff mirrors "Scoped case update": 1669 and
-- admins any case; rescue cases assigned to their team (primary or
-- supporting); a hospital cases sent to it. Rescue and hospitals can't
-- create a *new* case in someone else's name -- only save one that already
-- exists.

-- A policy on cases can't query cases itself (infinite recursion), so the
-- existence check runs as the table owner, outside RLS. It only says whether
-- a case number is taken.
create or replace function public.case_exists(p_case_id text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from cases where case_id = p_case_id)
$$;
revoke all on function public.case_exists(text) from public;
grant execute on function public.case_exists(text) to authenticated;

drop policy if exists "Staff insert cases" on cases;
create policy "Staff insert cases" on cases for insert to authenticated with check (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
      and (
        p.is_admin
        or p.role = 'dispatch'
        or (
          (
            (p.role = 'rescue' and (cases.rescue_team_id = p.rescue_team_id or cases.supporting_rescue_team_id = p.rescue_team_id))
            or (p.role = 'hospital' and cases.hospital_id = p.hospital_id)
          )
          and (
            cases.reporter_user_id is null
            or cases.reporter_user_id = auth.uid()
            or public.case_exists(cases.case_id)
          )
        )
      )
  )
);
