-- Giorgio Games · cuentas, historial y top de jugadores.
-- Principios:
--   * Las contraseñas NO están aquí: las guarda Supabase Auth en auth.users con hash bcrypt.
--   * RLS activado en todas las tablas. Cada usuario solo puede LEER sus propias filas.
--   * Nadie escribe directamente en las tablas desde la app: solo con funciones del servidor (record_match,
--     delete_my_account) que validan los datos, limitan la frecuencia y usan auth.uid() (no confían en el cliente).
--   * El top público solo expone usuario, avatar, victorias y XP (nunca correos ni ids).

-- ------------------------------------------------------------------ tablas
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null unique check (username ~ '^[a-z0-9_]{3,16}$'),   -- siempre en minúsculas
  avatar      text not null default '🐱' check (avatar in ('🐱','🐶','🦊','🐼','🐸','🦁','🐯','🐵','🐧','🦄','🐙','👾')),
  xp          integer not null default 0 check (xp >= 0),
  created_at  timestamptz not null default now()
);

create table public.matches (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  game        text not null check (game in ('ajedrez','poker','batalla','ludo')),
  mode        text not null check (mode in ('bot','online')),
  level       smallint check (level between 0 and 2),
  result      text not null check (result in ('win','loss','draw')),
  xp          smallint not null default 0,
  created_at  timestamptz not null default now()
);
create index matches_user_recent on public.matches (user_id, created_at desc);

create table public.stats (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  game     text not null,
  mode     text not null,
  w        integer not null default 0,
  l        integer not null default 0,
  d        integer not null default 0,
  primary key (user_id, game, mode)
);

-- ------------------------------------------------------------------ RLS y permisos
alter table public.profiles enable row level security;
alter table public.matches  enable row level security;
alter table public.stats    enable row level security;

revoke all on public.profiles, public.matches, public.stats from anon, authenticated;
grant select on public.profiles, public.matches, public.stats to authenticated;
grant update (avatar) on public.profiles to authenticated;      -- solo el avatar se cambia desde la app

create policy "perfil: leer el propio"   on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "perfil: editar el propio" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "partidas: leer las propias" on public.matches for select to authenticated using (user_id = (select auth.uid()));
create policy "totales: leer los propios"  on public.stats   for select to authenticated using (user_id = (select auth.uid()));
-- Sin políticas de insert/delete: denegado para anon y authenticated.

-- ------------------------------------------------------------------ alta de perfil al registrarse
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(coalesce(new.raw_user_meta_data ->> 'username', '')));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------ funciones para la app

-- ¿Está libre el nombre de usuario? (para avisar antes de registrar)
create function public.username_available(p_username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_username ~ '^[a-z0-9_]{3,16}$'
     and not exists (select 1 from public.profiles where username = p_username);
$$;

-- Registrar una partida terminada. Valida, limita la frecuencia y calcula la XP en el servidor.
create function public.record_match(p_game text, p_mode text, p_level smallint, p_result text) returns json
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  gained smallint;
  new_xp integer;
begin
  if uid is null then raise exception 'no autenticado' using errcode = '28000'; end if;
  if p_game not in ('ajedrez','poker','batalla','ludo') or p_mode not in ('bot','online') or p_result not in ('win','loss','draw') then
    raise exception 'datos inválidos' using errcode = '22023';
  end if;
  if p_mode = 'bot' and (p_level is null or p_level not between 0 and 2) then raise exception 'nivel inválido' using errcode = '22023'; end if;
  if p_mode = 'online' then p_level := null; end if;
  -- Antitrampa básico: una partida cada 20 s y máximo 150 al día por cuenta.
  if exists (select 1 from public.matches where user_id = uid and created_at > now() - interval '20 seconds') then
    raise exception 'demasiado rápido' using errcode = 'P0001';
  end if;
  if (select count(*) from public.matches where user_id = uid and created_at > now() - interval '1 day') >= 150 then
    raise exception 'límite diario' using errcode = 'P0001';
  end if;
  gained := case
    when p_result = 'win'  then case when p_mode = 'online' then 40 else (array[10, 20, 35])[p_level + 1] end
    when p_result = 'draw' then case when p_mode = 'online' then 20 else (array[5, 10, 18])[p_level + 1] end
    else case when p_mode = 'online' then 8 else 3 end
  end;
  insert into public.matches (user_id, game, mode, level, result, xp) values (uid, p_game, p_mode, p_level, p_result, gained);
  insert into public.stats (user_id, game, mode, w, l, d)
    values (uid, p_game, p_mode, (p_result = 'win')::int, (p_result = 'loss')::int, (p_result = 'draw')::int)
    on conflict (user_id, game, mode) do update set
      w = public.stats.w + excluded.w, l = public.stats.l + excluded.l, d = public.stats.d + excluded.d;
  update public.profiles set xp = xp + gained where id = uid returning xp into new_xp;
  return json_build_object('xp', new_xp, 'gained', gained);
end $$;

-- Top público: solo datos de juego.
create function public.leaderboard(p_limit integer default 10)
returns table (username text, avatar text, wins bigint, xp integer)
language sql stable security definer set search_path = '' as $$
  select p.username, p.avatar, coalesce(sum(s.w), 0) as wins, p.xp
  from public.profiles p left join public.stats s on s.user_id = p.id
  group by p.id
  having coalesce(sum(s.w), 0) > 0
  order by wins desc, p.xp desc, p.created_at
  limit least(greatest(coalesce(p_limit, 10), 1), 50);
$$;

-- Borrar mi cuenta y todos mis datos (derecho a eliminar).
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no autenticado' using errcode = '28000'; end if;
  delete from auth.users where id = auth.uid();      -- en cascada: perfil, partidas y totales
end $$;

-- Supabase da permiso de ejecutar a anon/authenticated por defecto: se quita y se concede solo lo necesario.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.leaderboard(integer) to anon, authenticated;
grant execute on function public.record_match(text, text, smallint, text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
