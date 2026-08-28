-- Run this AFTER supabase-case-fk-columns.sql. case_feedback (star rating +
-- written complaint per case) has been readable and writable by anyone
-- since supabase-case-feedback-table.sql -- any citizen session could read
-- every other case's rating/complaint text. It's only ever meant to be
-- read in aggregate by dispatch (FeedbackStats.tsx) and written once by
-- the case's own reporter.

drop policy if exists "Public read case_feedback" on case_feedback;
drop policy if exists "Public insert case_feedback" on case_feedback;

create policy "Dispatch/admin read case_feedback" on case_feedback for select to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.approval_status = 'approved' and (p.is_admin or p.role = 'dispatch')
  )
);

create policy "Reporter insert own case_feedback" on case_feedback for insert to authenticated with check (
  exists (
    select 1 from cases c
    where c.case_id = case_feedback.case_id and c.reporter_user_id = auth.uid()
  )
);

revoke select, insert on case_feedback from anon;
grant select, insert on case_feedback to authenticated;
