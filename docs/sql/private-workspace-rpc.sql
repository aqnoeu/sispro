begin;
alter function public.sispro_read_workspace() set schema sispro_private;
alter function public.sispro_write_workspace(bigint,jsonb) set schema sispro_private;
create function public.sispro_read_workspace() returns jsonb language sql security invoker set search_path='' as $$ select sispro_private.sispro_read_workspace() $$;
create function public.sispro_write_workspace(expected_revision bigint, changes jsonb) returns bigint language sql security invoker set search_path='' as $$ select sispro_private.sispro_write_workspace(expected_revision,changes) $$;
revoke all on function public.sispro_read_workspace(),public.sispro_write_workspace(bigint,jsonb),sispro_private.sispro_read_workspace(),sispro_private.sispro_write_workspace(bigint,jsonb) from public,anon;
grant execute on function public.sispro_read_workspace(),public.sispro_write_workspace(bigint,jsonb),sispro_private.sispro_read_workspace(),sispro_private.sispro_write_workspace(bigint,jsonb) to authenticated;
notify pgrst,'reload schema';
commit;