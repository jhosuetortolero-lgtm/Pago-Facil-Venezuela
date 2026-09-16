-- Substitua pelo e-mail real antes de executar no SQL Editor do Supabase.
do $$
declare target_email text := 'SEU_EMAIL_DE_SUPER_ADMIN@example.com';
declare target_id uuid;
begin
  select id into target_id from auth.users where email = target_email;
  if target_id is null then
    raise exception 'Usuário não encontrado em auth.users: %', target_email;
  end if;
  insert into public.profiles (id, email, is_super_admin, status)
  values (target_id, target_email, true, 'active')
  on conflict (id) do update set email = excluded.email, is_super_admin = true, status = 'active';
end $$;
