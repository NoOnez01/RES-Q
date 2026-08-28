-- Run this AFTER supabase-admin-grant-policy.sql. Adds a per-org "lead"
-- role: someone from a specific rescue team or hospital who can approve
-- new registrations for THAT SAME org, without needing full dispatch/admin
-- power. Solves the same bootstrap problem admin did for dispatch, but
-- scoped -- a hospital's own HR/head doesn't need to see or touch any
-- other org's accounts.

alter table profiles add column if not exists is_org_lead boolean not null default false;

-- security definer so this can be called from a profiles RLS policy
-- without re-triggering that same policy (infinite recursion).
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
create policy "Dispatch/admin/org-lead read profiles" on profiles for select to authenticated using (
  is_approved_dispatch_or_admin(auth.uid())
  or is_org_lead_for(auth.uid(), rescue_team_id, hospital_id)
);

drop policy if exists "Dispatch/admin update any profile" on profiles;
create policy "Dispatch/admin/org-lead update profiles" on profiles for update to authenticated using (
  is_approved_dispatch_or_admin(auth.uid())
  or is_org_lead_for(auth.uid(), rescue_team_id, hospital_id)
);

-- Extends the escalation trigger: an org lead may change approval_status
-- (approve/reject) and is_org_lead (promote a co-lead) on a row belonging
-- to their OWN org, same as before it's still never allowed to touch
-- role/rescue_team_id/hospital_id, and is_admin still requires actual admin.
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
