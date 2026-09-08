-- Fixes admin/org-lead unable to approve a pending account (specifically
-- reported for rescue-team registrations). Re-asserts the FINAL, correct
-- state of the profiles table's permission functions/policies/trigger from
-- supabase-admin-grant-policy.sql + supabase-org-lead-system.sql in one
-- idempotent script -- safe to run even if some of those were already
-- applied, and fixes things if they were only partially applied (e.g. the
-- SELECT policy got updated to allow org-leads but the UPDATE policy did
-- not, which lets an org-lead SEE a pending account but not approve it).
--
-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New
-- query -> paste this whole file -> Run).

create or replace function is_approved_dispatch_or_admin(uid uuid)
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
      and (role = 'dispatch' or is_admin = true)
  );
$$;

create or replace function is_approved_admin(uid uuid)
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
      and is_admin = true
  );
$$;

alter table profiles add column if not exists is_org_lead boolean not null default false;

create or replace function is_org_lead_for(uid uuid, target_rescue_team_id text, target_hospital_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from profiles p
    where p.id = uid
      and p.approval_status = 'approved'
      and p.is_org_lead = true
      and (
        (target_rescue_team_id is not null and p.rescue_team_id = target_rescue_team_id)
        or (target_hospital_id is not null and p.hospital_id = target_hospital_id)
      )
  );
$$;

drop policy if exists "Dispatch/admin read all profiles" on profiles;
drop policy if exists "Dispatch/admin/org-lead read profiles" on profiles;
create policy "Dispatch/admin/org-lead read profiles" on profiles for select to authenticated using (
  is_approved_dispatch_or_admin(auth.uid())
  or is_org_lead_for(auth.uid(), rescue_team_id, hospital_id)
);

drop policy if exists "Dispatch/admin update any profile" on profiles;
drop policy if exists "Dispatch/admin/org-lead update profiles" on profiles;
create policy "Dispatch/admin/org-lead update profiles" on profiles for update to authenticated using (
  is_approved_dispatch_or_admin(auth.uid())
  or is_org_lead_for(auth.uid(), rescue_team_id, hospital_id)
);

create or replace function prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_org_lead boolean;
begin
  if auth.uid() is not null then
    if new.is_admin is distinct from old.is_admin and not is_approved_admin(auth.uid()) then
      raise exception 'Only an admin can grant or revoke admin status';
    end if;

    caller_is_org_lead := is_org_lead_for(auth.uid(), old.rescue_team_id, old.hospital_id);

    if not is_approved_dispatch_or_admin(auth.uid()) then
      if new.role is distinct from old.role
        or new.rescue_team_id is distinct from old.rescue_team_id
        or new.hospital_id is distinct from old.hospital_id
      then
        raise exception 'Not allowed to change role/org fields yourself';
      end if;

      if (new.approval_status is distinct from old.approval_status or new.is_org_lead is distinct from old.is_org_lead)
        and not caller_is_org_lead
      then
        raise exception 'Not allowed to change approval/org-lead fields yourself';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Diagnostic: run this SELECT by itself afterward (as yourself, in the
-- SQL Editor, which runs with no auth.uid() so it bypasses RLS) to check
-- what your own admin account actually looks like in the database. The
-- account you're using to click "อนุมัติ" needs approval_status =
-- 'approved' AND (role = 'dispatch' OR is_admin = true) -- if it shows
-- 'pending' or is_admin = false/role <> 'dispatch', that's the real bug,
-- and the one-time bootstrap line at the bottom of
-- supabase-profiles-table.sql needs to be run for that account's email.
-- ---------------------------------------------------------------------
-- select id, name, role, approval_status, is_admin, is_org_lead
-- from profiles
-- where id = (select id from auth.users where email = 'you@example.com');
