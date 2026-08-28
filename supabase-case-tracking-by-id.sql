-- Run this in the Supabase SQL Editor. Lets anyone who has a case's exact
-- internal id view a read-only snapshot of it, the same way a delivery
-- tracking number works -- needed because a case reported through the
-- LINE bot has no Supabase Auth session behind it (reporter_user_id is
-- null), so the normal RLS-scoped "Scoped case select" policy can never
-- match it for that citizen, even though they're the one who reported it.
--
-- Deliberately narrow: takes the exact id (a uid()-generated string with
-- real entropy, not a sequential number) and returns only the same case
-- data the tracking page already displays -- no listing/enumeration
-- capability, and it's the same information a reporter already sees for
-- their own web-reported case.

create or replace function get_case_snapshot(p_case_id text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select data from cases where data->>'id' = p_case_id;
$$;

grant execute on function get_case_snapshot(text) to anon, authenticated;

-- Companion fix: supabase-case-feedback-scoping.sql's insert policy required
-- reporter_user_id = auth.uid(), which a LINE-reported case (reporter_user_id
-- is null) can never satisfy for anyone -- feedback on it would silently
-- fail to insert. There's no session to scope it to for a LINE case, so
-- this allows feedback on any case that has no reporter session at all,
-- same trust level as the tracking-by-id function above.
drop policy if exists "Reporter insert own case_feedback" on case_feedback;
create policy "Reporter insert own case_feedback" on case_feedback for insert to authenticated with check (
  exists (
    select 1 from cases c
    where c.case_id = case_feedback.case_id
      and (c.reporter_user_id = auth.uid() or c.reporter_user_id is null)
  )
);
