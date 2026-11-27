-- Explicitly provision the test workspace only through trusted administration.
alter table public.sispro_profiles add column platform_role text check (platform_role is null or (platform_role='ceo' and role='admin'));
create table public.sispro_test_pgm_workspaces (user_id uuid primary key references auth.users(id),active boolean not null default true,data jsonb not null default '{}'::jsonb check(jsonb_typeof(data)='object' and octet_length(data::text)<=5242880),revision bigint not null default 1 check(revision>0));
alter table public.sispro_test_pgm_workspaces enable row level security;
revoke all on public.sispro_test_pgm_workspaces from public,anon,authenticated;
grant select on public.sispro_test_pgm_workspaces to authenticated;
grant update(data,revision) on public.sispro_test_pgm_workspaces to authenticated;
create policy test_pgm_read on public.sispro_test_pgm_workspaces for select to authenticated using (user_id=(select auth.uid()) and active and (select sispro_private.is_active()) and (select sispro_private.is_admin()) and not coalesce((select auth.jwt()->>'is_anonymous')='true',false));
create policy test_pgm_write on public.sispro_test_pgm_workspaces for update to authenticated using (user_id=(select auth.uid()) and active and (select sispro_private.is_active()) and (select sispro_private.is_admin()) and not coalesce((select auth.jwt()->>'is_anonymous')='true',false)) with check (user_id=(select auth.uid()) and active and (select sispro_private.is_active()) and (select sispro_private.is_admin()) and not coalesce((select auth.jwt()->>'is_anonymous')='true',false));
