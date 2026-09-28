-- Run this once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New
-- query -> paste this whole file -> Run), after supabase-rescue-vehicles.sql.
--
-- rescue_vehicles has a "Public read" policy, but the table privilege was
-- only granted to `authenticated` -- unlike rescue_teams and hospitals,
-- which grant select to `anon` too (supabase-org-tables.sql). The app
-- loads the organisations as soon as it opens, before its session exists,
-- so that first request ran as `anon` and got 401 on rescue_vehicles:
--   GET /rest/v1/rescue_vehicles?select=*&offset=0&limit=1000  401
-- (The app loads them again once signed in, so nothing was lost -- but the
-- first load failed as a whole and fell back to the built-in sample teams
-- until then.) Vehicles are readable by any session under the policy
-- already; this makes the grant match it, as for teams and hospitals.

grant select on rescue_vehicles to anon;
