begin;
create policy sispro_permanent_profile on public.sispro_profiles as restrictive for select to authenticated
using (coalesce((select auth.jwt())->>'is_anonymous','false')='false');
create policy sispro_permanent_workspace on public.sispro_workspaces as restrictive for all to authenticated
using (coalesce((select auth.jwt())->>'is_anonymous','false')='false')
with check (coalesce((select auth.jwt())->>'is_anonymous','false')='false');
commit;
