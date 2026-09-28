-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New
-- query -> paste this whole file -> Run), after supabase-case-fk-columns.sql.
--
-- Lets staff create cases. Until now the only insert policy on `cases` was
-- "Case insert own report" (reporter_user_id = auth.uid()) -- right for a
-- citizen reporting their own emergency, but it refused every case staff
-- create themselves: 1669 recording a call that came in by phone
-- (createDispatchCase) and a rescue team logging an incident it found
-- (createRescueFoundCase). Those have no reporter account, so the insert
-- failed with "new row violates row-level security policy for table
-- cases", the case never reached the database, and every later save of it
-- (location, assessment ...) failed the same way.
--
-- Updating an existing case is unaffected: an upsert that hits an existing
-- row is checked against the update policy, which already covers staff.

drop policy if exists "Staff insert cases" on cases;
create policy "Staff insert cases" on cases for insert to authenticated with check (
  -- Staff can't attribute a new case to someone else's account.
  (reporter_user_id is null or reporter_user_id = auth.uid())
  and exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
      and (
        p.is_admin
        or p.role = 'dispatch'
        -- A rescue team only logs cases it's handling itself.
        or (p.role = 'rescue' and cases.rescue_team_id = p.rescue_team_id)
      )
  )
);
