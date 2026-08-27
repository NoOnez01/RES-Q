-- Run this LAST, after supabase-org-tables.sql and supabase-profiles-table.sql.
-- Adds the real foreign-key columns cases was missing (it only ever stored
-- denormalized display strings like rescue_team_name), then replaces the
-- fully-open policies from supabase-case-tables.sql / supabase-add-delete-
-- policy.sql with ones scoped by the caller's own profile: dispatch/admin
-- see everything, a rescue user only cases assigned (primary or supporting)
-- to their own team, a hospital user only cases selecting their own
-- hospital, and a citizen only their own report.

alter table cases
  add column if not exists rescue_team_id text references rescue_teams(id),
  add column if not exists supporting_rescue_team_id text references rescue_teams(id),
  add column if not exists hospital_id text references hospitals(id),
  add column if not exists reporter_user_id uuid references auth.users(id);

drop policy if exists "Public read cases" on cases;
drop policy if exists "Public upsert cases" on cases;
drop policy if exists "Public update cases" on cases;
drop policy if exists "Public delete cases" on cases;

create policy "Scoped case select" on cases for select to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
      and (
        p.is_admin
        or p.role = 'dispatch'
        or (p.role = 'rescue' and (cases.rescue_team_id = p.rescue_team_id or cases.supporting_rescue_team_id = p.rescue_team_id))
        or (p.role = 'hospital' and cases.hospital_id = p.hospital_id)
        or (p.role = 'public' and cases.reporter_user_id = auth.uid())
      )
  )
);

-- Case creation happens before any of the assignment FKs are set -- the only
-- thing that needs checking at insert time is that a citizen can't attribute
-- their new case to someone else's identity.
create policy "Case insert own report" on cases for insert to authenticated
  with check (reporter_user_id = auth.uid());

create policy "Scoped case update" on cases for update to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
      and (
        p.is_admin
        or p.role = 'dispatch'
        or (p.role = 'rescue' and (cases.rescue_team_id = p.rescue_team_id or cases.supporting_rescue_team_id = p.rescue_team_id))
        or (p.role = 'hospital' and cases.hospital_id = p.hospital_id)
        or (p.role = 'public' and cases.reporter_user_id = auth.uid())
      )
  )
);

create policy "Scoped case delete" on cases for delete to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.approval_status = 'approved' and (p.is_admin or p.role = 'dispatch')
  )
);

-- Anonymous (no-session) access is no longer used once the app switches
-- public/citizen traffic to Supabase's anonymous auth (see src/lib/auth.ts)
-- -- an anonymous-auth session is `authenticated` with auth.uid() set, not
-- the raw `anon` role, so revoking `anon` here doesn't affect citizens.
revoke select, insert, update, delete on cases from anon;
grant select, insert, update, delete on cases to authenticated;
