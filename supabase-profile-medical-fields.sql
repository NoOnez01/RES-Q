-- Run this AFTER supabase-profiles-table.sql. Adds the extra personal/
-- medical fields shown on the Profile page (photo, nickname, birthdate,
-- blood type, allergies, chronic conditions) -- useful context for
-- dispatch/rescue/hospital in a real emergency, not just account info.
--
-- Also run supabase-avatar-storage-policy.sql once you've created an
-- "avatars" bucket in the Supabase dashboard (Storage -> New bucket,
-- public), the same way the case-media bucket was set up.

alter table profiles
  add column if not exists avatar_url text,
  add column if not exists nickname text,
  add column if not exists birthdate date,
  add column if not exists blood_type text check (blood_type is null or blood_type in ('A','B','AB','O','A+','A-','B+','B-','AB+','AB-','O+','O-')),
  add column if not exists allergies text,
  add column if not exists chronic_conditions text;

-- These are self-editable fields, not privilege fields -- the existing
-- "Update own profile" policy and prevent_self_privilege_escalation
-- trigger (which only guards role/org/approval_status/is_admin) already
-- allow a user to set these on their own row with no further changes needed.
