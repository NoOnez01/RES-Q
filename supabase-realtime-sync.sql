-- Run this in the Supabase SQL Editor. Moves the app off Firebase entirely —
-- Supabase's `cases` table becomes the single, real-time-synced source of
-- truth instead of a one-way SQL mirror.
--
-- `data` stores the full case object (same shape Firestore used to hold as
-- a whole document); the existing flattened columns stay for convenient SQL
-- querying/reporting, but the app itself only reads/writes `data`.

alter table cases add column if not exists data jsonb;

-- DELETE events only carry the primary key (case_id) unless replica
-- identity is FULL — without this, a deleted row's `data` (which is where
-- the app looks up the case's internal id to remove it locally) wouldn't be
-- included in the delete payload.
alter table cases replica identity full;

-- Adds this table to Supabase's realtime publication so postgres_changes
-- subscriptions (insert/update/delete) actually fire for it.
alter publication supabase_realtime add table cases;
