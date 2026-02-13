-- Confirma o e-mail do usuario admin para permitir login por senha quando a confirmacao por e-mail esta habilitada.
-- Observacao: isso atua diretamente na tabela auth.users. Use apenas para bootstrap inicial.

do $$
declare
  target_email text := 'marcelohabm@gmail.com';
begin
  if not exists (select 1 from auth.users where email = target_email) then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'users'
      and column_name = 'email_confirmed_at'
  ) then
    execute format(
      'update auth.users set email_confirmed_at = coalesce(email_confirmed_at, timezone(''utc'', now())) where email = %L',
      target_email
    );
  end if;
end;
$$;
