-- Run this in the Supabase SQL Editor after deploying line-push-notify
-- (supabase functions deploy line-push-notify).
--
-- The Triggers UI's "pick a function" dialog only lists plain Postgres
-- functions -- there's no direct "call a Supabase Edge Function" action
-- type there on this project, so this fires the Edge Function itself via
-- pg_net's net.http_post from inside a trigger function instead. The
-- payload shape below matches exactly what line-push-notify already
-- expects, so no code changes are needed on that side.
--
-- ---------------------------------------------------------------------
-- BEFORE running this: replace the two placeholders below --
--   <YOUR_PROJECT_REF>        e.g. bdcovkvtpkhjtyjpbfta
--   <YOUR_SERVICE_ROLE_KEY>   Settings > API Keys > Secret keys
-- (`alter database ... set` -- the usual way to keep secrets out of a
-- committed file -- isn't available on this project's SQL Editor role, so
-- they're literals in the function body instead. Fill them in locally,
-- run it, and avoid pushing your filled-in copy of this file back to a
-- public repo -- keep the placeholders in the version you commit.)
-- ---------------------------------------------------------------------

-- If this line also errors with "permission denied", enable pg_net from
-- the dashboard instead (Database > Extensions > search "pg_net" > enable),
-- then delete this line and re-run the rest of the file.
create extension if not exists pg_net with schema extensions;

create or replace function notify_line_on_case_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  function_url text := 'https://<YOUR_PROJECT_REF>.functions.supabase.co/line-push-notify';
  service_key text := '<YOUR_SERVICE_ROLE_KEY>';
begin
  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'cases',
      'record', to_jsonb(new),
      'old_record', to_jsonb(old)
    )
  );
  return new;
end;
$$;

drop trigger if exists on_case_status_change_notify_line on cases;
create trigger on_case_status_change_notify_line
  after update of status on cases
  for each row
  when (old.status is distinct from new.status)
  execute function notify_line_on_case_status_change();
