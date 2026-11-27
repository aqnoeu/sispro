-- Apply ONLY to a dedicated Sispro project. No real user data or credentials.
begin;
create table public.sispro_profiles (
  user_id uuid primary key references auth.users(id),
  display_name text not null check (length(display_name) between 1 and 200),
  role text not null default 'user' check (role in ('user','admin')),
  active boolean not null default false
);
create table public.sispro_workspaces (
  user_id uuid primary key references auth.users(id),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data)='object' and octet_length(data::text)<=5242880),
  revision bigint not null default 1 check (revision>0)
);
alter table public.sispro_profiles enable row level security;
alter table public.sispro_workspaces enable row level security;
revoke all on public.sispro_profiles, public.sispro_workspaces from public, anon, authenticated;
grant select on public.sispro_profiles to authenticated;
grant select, insert, update on public.sispro_workspaces to authenticated;
create schema if not exists sispro_private;
revoke all on schema sispro_private from public, anon;
grant usage on schema sispro_private to authenticated;
-- Private, non-API-exposed helpers, only inspect calling identity.
create function sispro_private.is_active() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.sispro_profiles where user_id=(select auth.uid()) and active);
$$;
create function sispro_private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.sispro_profiles where user_id=(select auth.uid()) and active and role='admin');
$$;
revoke all on function sispro_private.is_active(), sispro_private.is_admin() from public, anon, authenticated;
grant execute on function sispro_private.is_active(), sispro_private.is_admin() to authenticated;
create policy profile_read on public.sispro_profiles for select to authenticated
using (user_id=(select auth.uid()) or (select sispro_private.is_admin()));
create policy workspace_read on public.sispro_workspaces for select to authenticated
using (user_id=(select auth.uid()) and (select sispro_private.is_active()));
create policy workspace_insert on public.sispro_workspaces for insert to authenticated
with check (user_id=(select auth.uid()) and (select sispro_private.is_active()));
create policy workspace_update on public.sispro_workspaces for update to authenticated
using (user_id=(select auth.uid()) and (select sispro_private.is_active()))
with check (user_id=(select auth.uid()) and (select sispro_private.is_active()));
commit;
