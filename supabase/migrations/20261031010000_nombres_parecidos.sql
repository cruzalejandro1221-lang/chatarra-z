-- Giorgio Games · nombres de usuario únicos y sin imitaciones.
-- Además del nombre exacto, se compara una "clave" simplificada: sin guiones bajos, números que parecen letras
-- convertidos (0→o, 1→l, 3→e, 4→a, 5→s, 7→t, 8→b, 9→g, i→l) y letras repetidas juntas reducidas a una.
-- Así "coronel1221", "coronel_1221", "c0ronel1221" y "coronell1221" cuentan como el mismo nombre.
-- También se reservan nombres oficiales para que nadie se haga pasar por la marca.

create function public.username_key(p text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select regexp_replace(translate(replace(lower(p), '_', ''), '013457890i', 'oleastbgol'), '(.)\1+', '\1', 'g');
$$;

create function public.username_reserved(p text) returns boolean
language sql immutable parallel safe set search_path = '' as $$
  select public.username_key(p) in (select public.username_key(x) from unnest(array[
    'giorgio', 'giorgiogames', 'giorgio_games', 'quizcongiorgio', 'admin', 'administrador', 'soporte', 'support',
    'moderador', 'mod', 'staff', 'oficial', 'official', 'sistema', 'system', 'root', 'invitado', 'jugador', 'bot']) as x);
$$;

create unique index profiles_username_key on public.profiles (public.username_key(username));

-- ¿Está libre? (ni igual, ni parecido, ni reservado)
create or replace function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_username ~ '^[a-z0-9_]{3,16}$'
     and not public.username_reserved(p_username)
     and not exists (select 1 from public.profiles where public.username_key(username) = public.username_key(p_username));
$$;

-- Cambiar el nombre: misma regla (el propio nombre no cuenta como choque).
create or replace function public.set_username(p_username text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no autenticado' using errcode = '28000'; end if;
  if p_username !~ '^[a-z0-9_]{3,16}$' then raise exception 'nombre inválido' using errcode = '22023'; end if;
  if public.username_reserved(p_username) then raise exception 'username reserved' using errcode = '23505'; end if;
  if exists (select 1 from public.profiles where public.username_key(username) = public.username_key(p_username) and id <> auth.uid()) then
    raise exception 'username taken' using errcode = '23505';
  end if;
  update public.profiles set username = p_username, username_set = true where id = auth.uid();
end $$;

-- Alta: si el nombre pedido está ocupado o se parece a otro, falla; los generados (Google) buscan uno libre.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base text := lower(coalesce(meta ->> 'username', ''));
  cand text; i int := 0; chosen boolean := true;
begin
  if base ~ '^[a-z0-9_]{3,16}$' and (public.username_reserved(base)
      or exists (select 1 from public.profiles where public.username_key(username) = public.username_key(base))) then
    raise exception 'username taken' using errcode = '23505';
  end if;
  if base !~ '^[a-z0-9_]{3,16}$' then
    chosen := false;
    base := left(regexp_replace(lower(translate(coalesce(meta ->> 'full_name', meta ->> 'name', split_part(new.email, '@', 1), 'jugador'),
              'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')), '[^a-z0-9_]', '', 'g'), 10);
    if length(base) < 3 then base := 'jugador'; end if;
    loop
      cand := base || '_' || lpad(floor(random() * 10000)::int::text, 4, '0');
      exit when not exists (select 1 from public.profiles where public.username_key(username) = public.username_key(cand));
      i := i + 1;
      if i > 25 then cand := 'j_' || substr(replace(new.id::text, '-', ''), 1, 12); exit; end if;
    end loop;
    base := cand;
  end if;
  insert into public.profiles (id, username, username_set) values (new.id, base, chosen);
  return new;
end $$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.leaderboard(integer) to anon, authenticated;
grant execute on function public.record_match(text, text, smallint, text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.set_username(text) to authenticated;
grant execute on function public.heartbeat(text) to authenticated;
grant execute on function public.friend_request(text) to authenticated;
grant execute on function public.friend_respond(text, boolean) to authenticated;
grant execute on function public.friend_remove(text) to authenticated;
grant execute on function public.my_friends() to authenticated;
grant execute on function public.get_profile(text) to authenticated;
