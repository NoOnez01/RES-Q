-- Run this in the Supabase SQL Editor. Backs account linking: lets a user
-- who registered with email/Google also connect LINE (and vice versa),
-- converging on one profiles row instead of a separate account per login
-- method -- see linkLineIdentity/unlinkLineIdentity in src/lib/auth.ts and
-- the "บัญชีที่เชื่อมต่อ" section on the Settings page.
--
-- The unique constraint is what actually prevents two different accounts
-- from claiming the same LINE identity -- line-login-exchange relies on
-- that constraint violation (Postgres error code 23505) to return a clean
-- "already linked to another user" error instead of silently stealing the
-- link.

alter table profiles add column if not exists line_user_id text unique;
