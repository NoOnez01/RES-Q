-- Run this in the Supabase SQL Editor. Stores the post-case star rating and
-- optional written complaint from the reporter, kept as its own table (not
-- folded into the `cases` row) so it can be aggregated into stats -- average
-- rating, complaint volume, etc. -- without touching case data itself.

create table if not exists case_feedback (
  id uuid primary key default gen_random_uuid(),
  case_id text not null,
  rescue_team_id text,
  rescue_team_name text,
  rating smallint not null check (rating between 1 and 5),
  complaint text,
  created_at timestamptz not null default now()
);

alter table case_feedback enable row level security;

create policy "Public read case_feedback" on case_feedback for select to public using (true);
create policy "Public insert case_feedback" on case_feedback for insert to public with check (true);

grant select, insert on case_feedback to anon, authenticated;
