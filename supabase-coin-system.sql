-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New
-- query -> paste this whole file -> Run), after supabase-fix-approve-
-- permissions.sql (is_approved_admin) and supabase-case-fk-columns.sql
-- (cases.reporter_user_id).
--
-- Coin system: a citizen earns coins when a case they reported is completed,
-- then redeems them for rewards or donates them to partner foundations.
-- Admins set how many coins a case earns and manage the foundations,
-- rewards, and redemption requests.
--
-- A balance is the sum of an append-only ledger. Clients can read their own
-- ledger rows but never write them -- every change goes through the award
-- trigger or the security-definer functions below, so a balance can't be
-- forged from the browser.

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- Single row: the admin-adjustable reward per completed case.
create table if not exists coin_settings (
  id boolean primary key default true check (id),
  coins_per_case integer not null default 10 check (coins_per_case >= 0),
  updated_at timestamptz not null default now()
);
insert into coin_settings (id) values (true) on conflict (id) do nothing;

-- "Removing" a foundation or reward only deactivates it: past donations and
-- redemptions still point at it, and a citizen's history must keep showing
-- where their coins went.
create table if not exists foundations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  description text,
  cost integer not null check (cost > 0),
  -- null = unlimited
  stock integer check (stock is null or stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists reward_redemptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references rewards(id),
  -- Snapshots: the reward can be renamed/repriced after this was made.
  reward_name text not null,
  cost integer not null,
  contact_name text not null,
  contact_phone text not null,
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reward_redemptions_user on reward_redemptions (user_id, created_at desc);

create table if not exists coin_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount <> 0),
  kind text not null check (kind in ('case_reward', 'redeem', 'donate', 'refund')),
  -- case_reward: the cases.case_id (case number) it was earned on
  case_id text,
  reward_id uuid references rewards(id),
  foundation_id uuid references foundations(id),
  redemption_id bigint references reward_redemptions(id),
  created_at timestamptz not null default now()
);
-- One reward per case, however many times its status is re-pushed.
create unique index if not exists coin_ledger_one_reward_per_case on coin_ledger (case_id) where kind = 'case_reward';
create index if not exists coin_ledger_user on coin_ledger (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- Earning: the award trigger
-- ---------------------------------------------------------------------

create or replace function award_coins_on_case_completed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  amt integer;
begin
  if new.status is distinct from 'completed' or old.status is not distinct from 'completed' then
    return new;
  end if;
  if new.reporter_user_id is null then
    return new;
  end if;
  -- Only a completion made by staff pays out. A citizen may update their own
  -- case row (see supabase-case-fk-columns.sql), so without this they could
  -- mark their own report completed and farm coins.
  if not exists (
    select 1 from profiles
    where id = auth.uid()
      and approval_status = 'approved'
      and (is_admin or role in ('dispatch', 'rescue', 'hospital'))
  ) then
    return new;
  end if;
  -- Citizens only -- a case dispatch opened itself carries the dispatcher.
  if not exists (select 1 from profiles where id = new.reporter_user_id and role = 'public') then
    return new;
  end if;
  select coins_per_case into amt from coin_settings where id;
  if coalesce(amt, 0) <= 0 then
    return new;
  end if;
  insert into coin_ledger (user_id, amount, kind, case_id)
  values (new.reporter_user_id, amt, 'case_reward', new.case_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists cases_award_coins on cases;
create trigger cases_award_coins
  after update of status on cases
  for each row execute function award_coins_on_case_completed();

-- ---------------------------------------------------------------------
-- Spending: balance, redeem, donate
-- ---------------------------------------------------------------------

create or replace function coin_balance()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(sum(amount), 0)::integer from coin_ledger where user_id = auth.uid();
$$;

-- Errors are raised with a short code as the message (not_signed_in,
-- insufficient_coins, ...) -- src/lib/coins.ts maps them to Thai text.

create or replace function redeem_reward(p_reward_id uuid, p_contact_name text, p_contact_phone text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  r rewards%rowtype;
  bal integer;
  rid bigint;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if coalesce(trim(p_contact_name), '') = '' or coalesce(trim(p_contact_phone), '') = '' then
    raise exception 'contact_required';
  end if;
  -- One spend at a time per user, so two quick taps can't both pass the
  -- balance check; the row lock does the same for the reward's stock.
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select * into r from rewards where id = p_reward_id and active for update;
  if not found then raise exception 'reward_not_found'; end if;
  if r.stock is not null and r.stock <= 0 then raise exception 'out_of_stock'; end if;
  select coalesce(sum(amount), 0) into bal from coin_ledger where user_id = uid;
  if bal < r.cost then raise exception 'insufficient_coins'; end if;

  insert into reward_redemptions (user_id, reward_id, reward_name, cost, contact_name, contact_phone)
  values (uid, r.id, r.name, r.cost, trim(p_contact_name), trim(p_contact_phone))
  returning id into rid;
  insert into coin_ledger (user_id, amount, kind, reward_id, redemption_id)
  values (uid, -r.cost, 'redeem', r.id, rid);
  if r.stock is not null then
    update rewards set stock = stock - 1 where id = r.id;
  end if;
  return bal - r.cost;
end;
$$;

create or replace function donate_coins(p_foundation_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  bal integer;
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;
  if not exists (select 1 from foundations where id = p_foundation_id and active) then
    raise exception 'foundation_not_found';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  select coalesce(sum(amount), 0) into bal from coin_ledger where user_id = uid;
  if bal < p_amount then raise exception 'insufficient_coins'; end if;
  insert into coin_ledger (user_id, amount, kind, foundation_id)
  values (uid, -p_amount, 'donate', p_foundation_id);
  return bal - p_amount;
end;
$$;

-- Aggregate only (no donor identities), so it's safe for everyone to see
-- how much each foundation has received.
create or replace function foundation_donation_totals()
returns table (foundation_id uuid, total integer)
language sql
security definer
set search_path = public
stable
as $$
  select foundation_id, (-sum(amount))::integer
  from coin_ledger
  where kind = 'donate'
  group by foundation_id;
$$;

-- Admin: close a redemption. Cancelling gives the coins and the stock back.
create or replace function set_redemption_status(p_redemption_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rd reward_redemptions%rowtype;
begin
  if not is_approved_admin(auth.uid()) then raise exception 'forbidden'; end if;
  if p_status not in ('fulfilled', 'cancelled') then raise exception 'invalid_status'; end if;
  select * into rd from reward_redemptions where id = p_redemption_id for update;
  if not found then raise exception 'not_found'; end if;
  if rd.status <> 'pending' then raise exception 'already_closed'; end if;

  update reward_redemptions set status = p_status, updated_at = now() where id = rd.id;
  if p_status = 'cancelled' then
    insert into coin_ledger (user_id, amount, kind, reward_id, redemption_id)
    values (rd.user_id, rd.cost, 'refund', rd.reward_id, rd.id);
    update rewards set stock = stock + 1 where id = rd.reward_id and stock is not null;
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Row-level security and grants
-- ---------------------------------------------------------------------

alter table coin_settings enable row level security;
alter table foundations enable row level security;
alter table rewards enable row level security;
alter table reward_redemptions enable row level security;
alter table coin_ledger enable row level security;

drop policy if exists "Read coin settings" on coin_settings;
drop policy if exists "Admin update coin settings" on coin_settings;
create policy "Read coin settings" on coin_settings for select to anon, authenticated using (true);
create policy "Admin update coin settings" on coin_settings for update to authenticated
  using (is_approved_admin(auth.uid())) with check (is_approved_admin(auth.uid()));

-- Readable by everyone, removed entries included: citizens are usually
-- anonymous sessions, the catalog isn't sensitive, and a citizen's history
-- still has to name a foundation/reward that has since been removed. The
-- pages themselves only offer active ones.
drop policy if exists "Read foundations" on foundations;
drop policy if exists "Admin insert foundations" on foundations;
drop policy if exists "Admin update foundations" on foundations;
create policy "Read foundations" on foundations for select to anon, authenticated using (true);
create policy "Admin insert foundations" on foundations for insert to authenticated
  with check (is_approved_admin(auth.uid()));
create policy "Admin update foundations" on foundations for update to authenticated
  using (is_approved_admin(auth.uid())) with check (is_approved_admin(auth.uid()));

drop policy if exists "Read rewards" on rewards;
drop policy if exists "Admin insert rewards" on rewards;
drop policy if exists "Admin update rewards" on rewards;
create policy "Read rewards" on rewards for select to anon, authenticated using (true);
create policy "Admin insert rewards" on rewards for insert to authenticated
  with check (is_approved_admin(auth.uid()));
create policy "Admin update rewards" on rewards for update to authenticated
  using (is_approved_admin(auth.uid())) with check (is_approved_admin(auth.uid()));

-- Read-only for clients: writes happen only in the functions above.
drop policy if exists "Own or admin read redemptions" on reward_redemptions;
create policy "Own or admin read redemptions" on reward_redemptions for select to authenticated
  using (user_id = auth.uid() or is_approved_admin(auth.uid()));

drop policy if exists "Own or admin read coin ledger" on coin_ledger;
create policy "Own or admin read coin ledger" on coin_ledger for select to authenticated
  using (user_id = auth.uid() or is_approved_admin(auth.uid()));

grant select on coin_settings, foundations, rewards to anon, authenticated;
grant update on coin_settings to authenticated;
grant insert, update on foundations, rewards to authenticated;
grant select on reward_redemptions, coin_ledger to authenticated;

revoke execute on function award_coins_on_case_completed() from public, anon, authenticated;
revoke execute on function coin_balance(), redeem_reward(uuid, text, text), donate_coins(uuid, integer),
  set_redemption_status(bigint, text) from public, anon;
grant execute on function coin_balance(), redeem_reward(uuid, text, text), donate_coins(uuid, integer),
  set_redemption_status(bigint, text) to authenticated;
grant execute on function foundation_donation_totals() to anon, authenticated;
