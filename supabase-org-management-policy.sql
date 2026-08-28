-- Run this AFTER supabase-org-tables.sql. rescue_teams/hospitals have only
-- ever had SELECT (public) and INSERT (authenticated, for self-registration
-- at signup) policies -- there was no way to edit or remove an org row
-- through the app at all, even for an admin. Needed for the admin "manage
-- organizations" screen (create/edit/delete rescue teams and hospitals).

create policy "Dispatch/admin update rescue_teams" on rescue_teams for update to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.approval_status = 'approved' and (p.is_admin or p.role = 'dispatch')
  )
);

create policy "Dispatch/admin delete rescue_teams" on rescue_teams for delete to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.approval_status = 'approved' and (p.is_admin or p.role = 'dispatch')
  )
);

create policy "Dispatch/admin update hospitals" on hospitals for update to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.approval_status = 'approved' and (p.is_admin or p.role = 'dispatch')
  )
);

create policy "Dispatch/admin delete hospitals" on hospitals for delete to authenticated using (
  exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.approval_status = 'approved' and (p.is_admin or p.role = 'dispatch')
  )
);

grant update, delete on rescue_teams to authenticated;
grant update, delete on hospitals to authenticated;
