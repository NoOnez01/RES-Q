-- Run this in the Supabase SQL Editor after deploying line-push-notify
-- (supabase functions deploy line-push-notify).
--
-- The Triggers UI's "pick a function" dialog only lists plain Postgres
-- functions -- there's no direct "call a Supabase Edge Function" action
-- type there on this project, so this fires the Edge Function itself via
-- pg_net's net.http_post from inside a trigger function instead. The
-- payload shape below matches exactly what line-push-notify already
-- expects (it was written against Supabase's Database Webhooks payload
-- format), so no code changes are needed on that side.
--
-- ---------------------------------------------------------------------
-- REQUIRED one-time setup -- run these two commands FIRST, by themselves,
-- directly in the SQL Editor (NOT saved into this file, since it's
-- committed to git and these two values are secrets/your specific URL):
--
--   alter database postgres set app.settings.line_push_notify_url =
--     'https://<your-project-ref>.functions.supabase.co/line-push-notify';
--
--   alter database postgres set app.settings.service_role_key =
--     '<your project''s service_role key -- Settings > API Keys > Secret keys>';
--
-- Open a NEW SQL Editor query (or wait a moment) after running those two --
-- `alter database ... set` only takes effect for new connections, not the
-- one that ran it. Then run the rest of this file below.
-- ---------------------------------------------------------------------

create extension if not exists pg_net with schema extensions;

create or replace function notify_line_on_case_status_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  function_url text := current_setting('app.settings.line_push_notify_url', true);
  service_key text := current_setting('app.settings.service_role_key', true);
begin
  if function_url is null or service_key is null then
    -- Not configured yet (see the setup block above) -- skip silently
    -- rather than blocking every case update on a config problem.
    return new;
  end if;

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
