-- Run this after supabase-org-tables.sql. Registration originally only let
-- rescue/hospital sign-up pick from the existing roster -- this adds the
-- ability to register a team/hospital that isn't listed yet, which needs an
-- INSERT policy neither table had (only "Public read ..." existed before).

create policy "Authenticated insert rescue_teams" on rescue_teams for insert to authenticated with check (true);
create policy "Authenticated insert hospitals" on hospitals for insert to authenticated with check (true);

grant insert on rescue_teams to authenticated;
grant insert on hospitals to authenticated;
