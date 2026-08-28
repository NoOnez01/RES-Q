-- Run this in the Supabase SQL Editor. Backs the LINE OA emergency-report
-- bot (supabase/functions/line-webhook) -- lets a citizen report an
-- emergency straight from a LINE chat instead of opening the web app.
--
-- The webhook function only ever writes through the Supabase SERVICE ROLE
-- key (never the anon key), because a LINE user has no Supabase Auth
-- session for the existing per-role RLS to key off of -- service role
-- bypasses RLS entirely, same trust level as direct SQL-editor access.

-- One row per LINE user currently mid-conversation with the bot -- LINE
-- webhooks are stateless per request, so the step they're on and the case
-- being built have to be remembered somewhere between messages.
create table if not exists line_bot_sessions (
  line_user_id text primary key,
  case_id text not null,
  step text not null check (step in ('awaiting_photo', 'awaiting_location', 'awaiting_phone', 'awaiting_consciousness')),
  case_data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table line_bot_sessions enable row level security;
-- No policies on purpose -- only the service role (which bypasses RLS)
-- ever touches this table; nothing here should be reachable via the anon
-- key at all.
revoke all on line_bot_sessions from anon, authenticated;

-- Tracks which LINE user filed a case, purely for the bot's own records
-- (e.g. if you want to look up "cases reported via LINE" later). Not used
-- by any RLS policy -- LINE-reported cases have reporter_user_id = null
-- (no Supabase Auth session exists for them), so they're visible to
-- dispatch/admin like any case but won't show up on the citizen's own
-- "my cases" view on the web app, since there's no web session to match.
alter table cases add column if not exists reporter_line_user_id text;
