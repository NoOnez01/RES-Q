-- Run this in the Supabase SQL Editor. This project's service_role has no
-- blanket access to public tables (see supabase-line-bot-grants.sql, which
-- hit the exact same "permission denied for table cases" issue for a
-- different table) -- each table a service-role Edge Function touches needs
-- an explicit grant here.
--
-- line-login-exchange (account linking) and line-push-notify (LINE push
-- notifications) both read/write profiles.line_user_id using the service
-- role key, since a LINE user/webhook call has no Supabase Auth session for
-- the normal RLS-scoped access to key off of.

grant select, update on profiles to service_role;
