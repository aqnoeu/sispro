create or replace function sispro_private.delete_test_role(target_role uuid,target_institution uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if not sispro_private.is_ceo() then raise exception 'Acesso negado' using errcode='42501'; end if;
 perform 1 from public.sispro_roles r join public.sispro_institutions i on i.id=r.institution_id
 where r.id=target_role and i.id=target_institution and i.is_test for update of r;
 if not found then raise exception 'Cargo fora da Procuradoria de Teste' using errcode='42501'; end if;
 if exists(select 1 from public.sispro_members where role_id=target_role) then raise exception 'Desvincule ou reatribua os usuários antes de excluir o cargo'; end if;
 delete from public.sispro_permissions where role_id=target_role;
 delete from public.sispro_roles where id=target_role;
end $$;
revoke all on function sispro_private.delete_test_role(uuid,uuid) from public,anon;
grant execute on function sispro_private.delete_test_role(uuid,uuid) to authenticated;
create or replace function public.sispro_delete_test_role(target_role uuid,target_institution uuid)
returns void language sql security invoker set search_path='' as $$ select sispro_private.delete_test_role(target_role,target_institution) $$;
revoke all on function public.sispro_delete_test_role(uuid,uuid) from public,anon;
grant execute on function public.sispro_delete_test_role(uuid,uuid) to authenticated;
