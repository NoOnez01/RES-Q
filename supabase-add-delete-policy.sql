-- Run this in the Supabase SQL Editor. The original supabase-case-tables.sql
-- only granted select/insert/update, so "clear all data" in the app has no
-- way to actually delete the synced rows (they'd just get re-pulled/re-shown
-- on the next sync). This adds delete permission for both tables.

create policy "Public delete cases" on cases for delete to public using (true);
create policy "Public delete case_media" on case_media for delete to public using (true);

grant delete on cases to anon, authenticated;
grant delete on case_media to anon, authenticated;

-- Removes a harmless throwaway row left behind while verifying this fix.
delete from cases where case_id like 'TEST-DELETE-CHECK-%';
