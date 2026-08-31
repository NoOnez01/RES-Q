-- rescue_teams/rescue_vehicles were created with grants only for
-- anon/authenticated (see supabase-org-tables.sql, supabase-rescue-vehicles.sql).
-- This project's service_role has no blanket table access, so a
-- server-side script (e.g. importing the NDEMS unit directory as org
-- shells real crews can later register into) needs it granted explicitly,
-- same as every other service-role-touched table in this project.
grant select, insert, update, delete on public.rescue_teams to service_role;
grant select, insert, update, delete on public.rescue_vehicles to service_role;
