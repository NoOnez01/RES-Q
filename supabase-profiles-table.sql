-- Run this AFTER supabase-org-tables.sql. Creates the profiles table (one
-- row per auth user, holding role/org/approval-status -- the identity Real
-- auth was missing) plus the RLS needed to keep it from being a privilege-
-- escalation hole: a user can read/insert/update their OWN row, but a
-- trigger blocks them from changing their own role/org/approval/admin
-- fields -- only an approved dispatch user or an admin can do that.

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('public','dispatch','rescue','hospital')),
  name text not null,
  phone text,
  rescue_team_id text references rescue_teams(id),
  hospital_id text references hospitals(id),
  approval_status text not null default 'pending' check (approval_status in ('pending','approved','rejected')),
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  constraint rescue_needs_team check (role != 'rescue' or rescue_team_id is not null),
  constraint hospital_needs_org check (role != 'hospital' or hospital_id is not null)
);

alter table profiles enable row level security;

-- security definer so this can be called FROM a profiles RLS policy without
-- that inner query re-triggering the same policy on itself (infinite
-- recursion) -- it runs with the function owner's privileges, bypassing RLS
-- for this one read-only check.
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

create policy "Read own profile" on profiles for select to authenticated
  using (id = auth.uid());

create policy "Dispatch/admin read all profiles" on profiles for select to authenticated
  using (is_approved_dispatch_or_admin(auth.uid()));

-- Registering yourself is fine; registering yourself as already-approved,
-- as admin, or as a rescue/hospital user with no org picked is not.
create policy "Insert own profile" on profiles for insert to authenticated
  with check (
    id = auth.uid()
    and is_admin = false
    and (
      (role = 'public' and approval_status = 'approved')
      or (role in ('dispatch', 'rescue', 'hospital') and approval_status = 'pending')
    )
  );

create policy "Update own profile" on profiles for update to authenticated
  using (id = auth.uid());

create policy "Dispatch/admin update any profile" on profiles for update to authenticated
  using (is_approved_dispatch_or_admin(auth.uid()));

grant select, insert, update on profiles to authenticated;

-- The row-level policy above lets a user UPDATE their own row (e.g. to fix
-- a typo'd phone number) but says nothing about which COLUMNS -- without
-- this trigger, a plain authenticated user could self-approve, grant
-- themselves is_admin, or switch role/org by just updating their own row.
create or replace function prevent_self_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A direct query in the Supabase SQL Editor (or anything else running as
  -- the table owner) has no auth.uid() at all -- that's trusted access, not
  -- a self-service app request, and is exactly how the one-time admin
  -- bootstrap below has to work. Only requests carrying a real Supabase
  -- Auth session (auth.uid() present) go through the escalation check.
  if auth.uid() is not null and not is_approved_dispatch_or_admin(auth.uid()) then
    if new.role is distinct from old.role
      or new.rescue_team_id is distinct from old.rescue_team_id
      or new.hospital_id is distinct from old.hospital_id
      or new.approval_status is distinct from old.approval_status
      or new.is_admin is distinct from old.is_admin
    then
      raise exception 'Not allowed to change role/org/approval/admin fields yourself';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_prevent_escalation
  before update on profiles
  for each row execute function prevent_self_privilege_escalation();

-- Public/citizen users never see a registration form -- they get an
-- anonymous Supabase Auth session transparently on first visit (see
-- src/lib/auth.ts), so their profile row has to be created automatically
-- rather than through the app's explicit registration insert.
create or replace function handle_new_anonymous_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_anonymous then
    insert into profiles (id, role, name, approval_status)
    values (new.id, 'public', 'ผู้ใช้ทั่วไป', 'approved')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_anonymous_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_anonymous_user();

-- ---------------------------------------------------------------------
-- Bootstrap: run this ONE line yourself, once, after your own account
-- exists, to become the first admin (needed to approve the very first
-- dispatch account -- see the plan for why). Replace the email.
-- ---------------------------------------------------------------------
-- update profiles set is_admin = true, approval_status = 'approved'
-- where id = (select id from auth.users where email = 'you@example.com');
