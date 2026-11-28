create table sispro_private.drive_test_credentials (
 user_id uuid primary key references auth.users(id) on delete restrict,
 secret_id uuid not null unique references vault.secrets(id),
 revision bigint not null default 1
);
alter table sispro_private.drive_test_credentials enable row level security;
revoke all on sispro_private.drive_test_credentials from public,anon,authenticated;
create function public.sispro_drive_test_secret_read(target_user uuid) returns jsonb language sql security definer set search_path='' as $$
 select jsonb_build_object('revision',c.revision,'value',v.decrypted_secret::jsonb)
 from sispro_private.drive_test_credentials c join vault.decrypted_secrets v on v.id=c.secret_id where c.user_id=target_user
$$;
create function public.sispro_drive_test_secret_write(target_user uuid,expected_revision bigint,new_value jsonb) returns bigint language plpgsql security definer set search_path='' as $$
declare current_row sispro_private.drive_test_credentials%rowtype; sid uuid;
begin
 if new_value is null or jsonb_typeof(new_value)<>'object' or length(new_value::text)>20000 then raise exception 'Invalid value'; end if;
 perform pg_advisory_xact_lock(hashtextextended('drive-test:'||target_user::text,0));
 select * into current_row from sispro_private.drive_test_credentials where user_id=target_user for update;
 if current_row.revision is distinct from expected_revision then raise exception 'Revision conflict' using errcode='40001'; end if;
 if current_row.revision is null then
  sid:=vault.create_secret(new_value::text);
  insert into sispro_private.drive_test_credentials(user_id,secret_id) values(target_user,sid);
  return 1;
 end if;
 perform vault.update_secret(current_row.secret_id,new_value::text);
 update sispro_private.drive_test_credentials set revision=revision+1 where user_id=target_user;
 return current_row.revision+1;
end $$;
revoke all on function public.sispro_drive_test_secret_read(uuid),public.sispro_drive_test_secret_write(uuid,bigint,jsonb) from public,anon,authenticated;
grant execute on function public.sispro_drive_test_secret_read(uuid),public.sispro_drive_test_secret_write(uuid,bigint,jsonb) to service_role;