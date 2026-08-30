-- Run this in the Supabase SQL Editor. Fixes a duplicate-notification bug:
-- LINE's webhook delivery is at-least-once -- the same inbound message can
-- be delivered to line-webhook more than once (a slow response triggering
-- LINE's own retry, or near-simultaneous duplicate delivery), and the
-- handler had no idempotency check. Two deliveries of the same message can
-- each independently see the still-existing conversation session and each
-- send their own valid "แจ้งเหตุสำเร็จ" reply, which is the double card
-- users were seeing.
--
-- One row per LINE message id ever handled. The insert in line-webhook is
-- the idempotency check itself: a unique-constraint violation means this
-- exact message was already processed, so the handler skips it -- safe even
-- under truly concurrent requests, unlike a read-then-write check.

create table if not exists line_processed_messages (
  message_id text primary key,
  processed_at timestamptz not null default now()
);

alter table line_processed_messages enable row level security;
-- Same reasoning as line_bot_sessions: only the service role (which
-- bypasses RLS) ever touches this table.
revoke all on line_processed_messages from anon, authenticated;

-- This project's service_role has no blanket access to public tables (see
-- supabase-line-bot-grants.sql) -- each table a service-role Edge Function
-- touches needs an explicit grant.
grant select, insert on line_processed_messages to service_role;

-- Old rows are pure bookkeeping with no reason to accumulate forever; a
-- message can't be redelivered days later, so anything older than a day is
-- safe to drop. Run this manually now and then, or wire it to pg_cron if
-- the project ever adds it -- not required for the fix to work.
-- delete from line_processed_messages where processed_at < now() - interval '1 day';
