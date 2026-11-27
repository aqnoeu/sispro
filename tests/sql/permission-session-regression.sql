-- Execute as database administrator; all fictitious rows are rolled back.
begin;
do $$ declare u uuid:=gen_random_uuid(); sid uuid:=gen_random_uuid(); fresh uuid:=gen_random_uuid(); rid uuid; iid uuid; v integer; d jsonb; rev bigint; denied boolean; begin
 if has_table_privilege('authenticated','public.sispro_workspaces','SELECT') or has_table_privilege('authenticated','public.sispro_workspaces','UPDATE') or has_function_privilege('anon','public.sispro_read_workspace()','EXECUTE') then raise exception 'Direct access regression';end if;
 insert into auth.users(id,email,created_at,is_sso_user,is_anonymous,encrypted_password) values(u,'sispro-qa-'||u||'@example.invalid',now(),false,false,'fixture-before');
 insert into auth.sessions(id,user_id,created_at) values(sid,u,clock_timestamp());
 insert into public.sispro_profiles(user_id,display_name,role,active) values(u,'QA transacional','user',true);
 insert into public.sispro_institutions(name) values('QA '||u) returning id into iid;
 insert into public.sispro_roles(institution_id,name) values(iid,'QA') returning id into rid;
 insert into public.sispro_members(institution_id,user_id,role_id) values(iid,u,rid);
 insert into public.sispro_institution_mechanics(institution_id,mechanic_id,enabled) values(iid,'processos',true);
 insert into public.sispro_permissions(role_id,mechanic_id,access_level) values(rid,'processos',0);
 insert into public.sispro_workspaces(user_id,data,revision) values(u,'{"processos":{"qa":{"numero":"QA"}},"agenda":{"secret":{"titulo":"QA"}}}',1);
 perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated','session_id',sid)::text,true);
 for v in 0..3 loop
 update public.sispro_permissions set access_level=v where role_id=rid and mechanic_id='processos';
 d:=public.sispro_read_workspace();
 if (d->'levels'->>'processos')::int<>v or (d->'data'?'processos')<>(v>=1) or d->'data'?'agenda' then raise exception 'Read failure level %',v; end if;
 rev:=(d->>'revision')::bigint; denied:=false;
 begin perform public.sispro_write_workspace(rev,jsonb_build_object('processos',jsonb_build_object('qa',jsonb_build_object('numero','QA '||v)))); exception when insufficient_privilege then denied:=true; end;
 if denied<>(v<2) then raise exception 'Write failure level %',v; end if;
 rev:=(public.sispro_read_workspace()->>'revision')::bigint; denied:=false;
 begin perform public.sispro_write_workspace(rev,'{"processos":{}}'); exception when insufficient_privilege then denied:=true; end;
 if denied<>(v<3) then raise exception 'Removal failure level %',v; end if;
 end loop;
 update auth.users set encrypted_password='fixture-after' where id=u;
 if sispro_private.session_valid() then raise exception 'Password change failed';end if;
 insert into auth.sessions(id,user_id,created_at) values(fresh,u,clock_timestamp());
 perform set_config('request.jwt.claims',json_build_object('sub',u,'role','authenticated','session_id',fresh)::text,true);
 if not sispro_private.session_valid() then raise exception 'Fresh session denied';end if;
 update public.sispro_profiles set active=false where user_id=u;
 if sispro_private.session_valid() then raise exception 'Revocation failed'; end if;
 update public.sispro_profiles set active=true where user_id=u;
 if sispro_private.session_valid() then raise exception 'Old session revived'; end if;
end $$;
select 'permission and session regressions passed' as result;
rollback;