alter table public.sispro_cabinets add constraint sispro_cabinets_institution_id_key unique(institution_id,id);
alter table public.sispro_members add column cabinet_id uuid;
alter table public.sispro_members add constraint sispro_members_cabinet_scope foreign key(institution_id,cabinet_id) references public.sispro_cabinets(institution_id,id);
alter table public.sispro_members add constraint sispro_members_cabinet_requires_institution check(cabinet_id is null or institution_id is not null);
insert into public.sispro_roles(institution_id,name)
select i.id,v.name from public.sispro_institutions i cross join (values ('PGM'),('Assessor do PGM'),('Procurador'),('Assessor'),('Estagiário')) v(name) on conflict do nothing;
create or replace function sispro_private.seed_institution_roles() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into public.sispro_roles(institution_id,name) select new.id,v.name from (values ('PGM'),('Assessor do PGM'),('Procurador'),('Assessor'),('Estagiário')) v(name) on conflict do nothing;
 return new;
end $$;
revoke all on function sispro_private.seed_institution_roles() from public,anon,authenticated;
create trigger sispro_seed_institution_roles after insert on public.sispro_institutions for each row execute function sispro_private.seed_institution_roles();
revoke execute on function public.sispro_delete_test_role(uuid,uuid) from authenticated;
revoke execute on function sispro_private.delete_test_role(uuid,uuid) from authenticated;
