-- Run this AFTER supabase-profiles-table.sql. Tightens who can grant/revoke
-- is_admin: today the escalation trigger only blocks a user from changing
-- their OWN privileged fields -- it does not stop an approved DISPATCH
-- account (not admin) from setting is_admin=true on someone else's row via
-- a direct API call, since the "Dispatch/admin update any profile" policy
-- allows dispatch to update any row and the trigger's guard only checks
-- "is this caller dispatch-or-admin" for ALL privileged fields together.
-- This adds a stricter, separate check specifically for is_admin: only an
-- already-approved admin (not just dispatch) may change that one column,
-- on any row including their own.

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

create or replace function prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A direct query in the Supabase SQL Editor (or anything else running as
  -- the table owner) has no auth.uid() at all -- that's trusted access, not
  -- an app request, and is exactly how the one-time admin bootstrap works.
  if auth.uid() is not null then
    if new.is_admin is distinct from old.is_admin and not is_approved_admin(auth.uid()) then
      raise exception 'Only an admin can grant or revoke admin status';
    end if;

    if not is_approved_dispatch_or_admin(auth.uid()) then
      if new.role is distinct from old.role
        or new.rescue_team_id is distinct from old.rescue_team_id
        or new.hospital_id is distinct from old.hospital_id
        or new.approval_status is distinct from old.approval_status
      then
        raise exception 'Not allowed to change role/org/approval fields yourself';
      end if;
    end if;
  end if;
  return new;
end;
$$;
