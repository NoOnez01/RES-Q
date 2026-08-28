-- Run this in the Supabase SQL Editor. The LINE webhook Edge Function
-- writes through the service_role key (bypasses RLS by design -- see
-- supabase-line-bot-schema.sql), but RLS bypass doesn't skip the base
-- table-level GRANT check that runs before RLS is even evaluated. Earlier
-- migrations only ever granted `anon`/`authenticated` on these tables, so
-- service_role hit a plain "permission denied for table cases" error.

grant select, insert, update, delete on cases to service_role;
grant select, insert, update, delete on case_media to service_role;
grant select, insert, update, delete on line_bot_sessions to service_role;
