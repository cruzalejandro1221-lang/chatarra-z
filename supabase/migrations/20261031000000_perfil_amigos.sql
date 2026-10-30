-- Giorgio Games · perfil de juego: en línea, horas por juego, amigos y usuario automático para Google/Facebook.
-- Misma regla que la migración anterior: RLS en todo, lectura solo de lo propio, escritura solo con funciones del servidor.

-- ------------------------------------------------------------------ columnas y tablas nuevas
alter table public.profiles
  add column last_seen    timestamptz,
  add column playing      text check (playing in ('ajedrez','poker','batalla','ludo','chatarra')),
  add column username_set boolean not null default true;      -- false = nombre generado, se le pide elegir uno

create table public.playtime (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  game     text not null check (game in ('ajedrez','poker','batalla','ludo','chatarra')),
  seconds  integer not null default 0 check (seconds >= 0),
  primary key (user_id, game)
);

create table public.friendships (
  a            uuid not null references public.profiles (id) on delete cascade,   -- siempre a < b (un solo registro por pareja)
  b            uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null,
  status       text not null check (status in ('pending','accepted')),
  created_at   timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
create index friendships_b on public.friendships (b);

alter table public.playtime    enable row level security;
alter table public.friendships enable row level security;
revoke all on public.playtime, public.friendships from anon, authenticated;
grant select on public.playtime, public.friendships to authenticated;
create policy "horas: leer las propias"   on public.playtime    for select to authenticated using (user_id = (select auth.uid()));
create policy "amistades: leer las propias" on public.friendships for select to authenticated using ((select auth.uid()) in (a, b));

-- ------------------------------------------------------------------ alta: nombre automático si no viene uno válido (Google, Facebook)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base text := lower(coalesce(meta ->> 'username', ''));
  cand text; i int := 0; chosen boolean := true;
begin
  if base ~ '^[a-z0-9_]{3,16}$' and exists (select 1 from public.profiles where username = base) then
    raise exception 'username taken' using errcode = '23505';
  end if;
  if base !~ '^[a-z0-9_]{3,16}$' then
    chosen := false;
    base := left(regexp_replace(lower(translate(coalesce(meta ->> 'full_name', meta ->> 'name', split_part(new.email, '@', 1), 'jugador'),
              'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunaeiouun')), '[^a-z0-9_]', '', 'g'), 10);
    if length(base) < 3 then base := 'jugador'; end if;
    loop
      cand := base || '_' || lpad(floor(random() * 10000)::int::text, 4, '0');
      exit when not exists (select 1 from public.profiles where username = cand);
      i := i + 1;
      if i > 25 then cand := 'j_' || substr(replace(new.id::text, '-', ''), 1, 12); exit; end if;
    end loop;
    base := cand;
  end if;
  insert into public.profiles (id, username, username_set) values (new.id, base, chosen);
  return new;
end $$;

-- ------------------------------------------------------------------ funciones nuevas
-- Elegir o cambiar el nombre de usuario.
create function public.set_username(p_username text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'no autenticado' using errcode = '28000'; end if;
  if p_username !~ '^[a-z0-9_]{3,16}$' then raise exception 'nombre inválido' using errcode = '22023'; end if;
  if exists (select 1 from public.profiles where username = p_username and id <> auth.uid()) then
    raise exception 'username taken' using errcode = '23505';
  end if;
  update public.profiles set username = p_username, username_set = true where id = auth.uid();
end $$;

-- Latido cada minuto: marca "en línea" y suma el tiempo de juego (lo mide el reloj del servidor, máx. 2 min por latido).
create function public.heartbeat(p_game text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); prev timestamptz; prevg text;
begin
  if uid is null then raise exception 'no autenticado' using errcode = '28000'; end if;
  if p_game is not null and p_game not in ('ajedrez','poker','batalla','ludo','chatarra') then raise exception 'juego inválido' using errcode = '22023'; end if;
  select last_seen, playing into prev, prevg from public.profiles where id = uid;
  if prev is not null and prev > now() - interval '15 seconds' and prevg is not distinct from p_game then return; end if;
  if prevg is not null and prevg = p_game and prev > now() - interval '3 minutes' then
    insert into public.playtime (user_id, game, seconds) values (uid, p_game, least(extract(epoch from now() - prev)::int, 120))
      on conflict (user_id, game) do update set seconds = public.playtime.seconds + excluded.seconds;
  end if;
  update public.profiles set last_seen = now(), playing = p_game where id = uid;
end $$;

-- Pedir amistad (si el otro ya me la pidió, se acepta).
create function public.friend_request(p_username text) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); other uuid; x uuid; y uuid; f public.friendships;
begin
  if me is null then raise exception 'no autenticado' using errcode = '28000'; end if;
  select id into other from public.profiles where username = lower(p_username);
  if other is null then raise exception 'usuario no encontrado' using errcode = 'P0002'; end if;
  if other = me then raise exception 'eres tú' using errcode = '22023'; end if;
  x := least(me, other); y := greatest(me, other);
  select * into f from public.friendships where a = x and b = y;
  if found then
    if f.status = 'accepted' then return 'ya_amigos'; end if;
    if f.requested_by = me then return 'pendiente'; end if;
    update public.friendships set status = 'accepted' where a = x and b = y;
    return 'aceptada';
  end if;
  if (select count(*) from public.friendships where requested_by = me and status = 'pending') >= 30 then
    raise exception 'demasiadas solicitudes' using errcode = 'P0001';
  end if;
  if (select count(*) from public.friendships where me in (a, b) and status = 'accepted') >= 300 then
    raise exception 'límite de amigos' using errcode = 'P0001';
  end if;
  insert into public.friendships (a, b, requested_by, status) values (x, y, me, 'pending');
  return 'enviada';
end $$;

-- Aceptar o rechazar una solicitud recibida.
create function public.friend_respond(p_username text, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); other uuid;
begin
  if me is null then raise exception 'no autenticado' using errcode = '28000'; end if;
  select id into other from public.profiles where username = lower(p_username);
  if other is null then return; end if;
  if p_accept then
    update public.friendships set status = 'accepted'
      where a = least(me, other) and b = greatest(me, other) and status = 'pending' and requested_by = other;
  else
    delete from public.friendships
      where a = least(me, other) and b = greatest(me, other) and status = 'pending' and requested_by = other;
  end if;
end $$;

-- Quitar amigo o cancelar una solicitud enviada.
create function public.friend_remove(p_username text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); other uuid;
begin
  if me is null then raise exception 'no autenticado' using errcode = '28000'; end if;
  select id into other from public.profiles where username = lower(p_username);
  if other is null then return; end if;
  delete from public.friendships where a = least(me, other) and b = greatest(me, other);
end $$;

-- Mi lista: amigos (con en línea y a qué juegan), solicitudes recibidas y enviadas.
create function public.my_friends()
returns table (username text, avatar text, xp integer, status text, online boolean, playing text)
language sql stable security definer set search_path = '' as $$
  select p.username, p.avatar, p.xp,
         case when f.status = 'accepted' then 'amigo' when f.requested_by = auth.uid() then 'enviada' else 'recibida' end,
         f.status = 'accepted' and p.last_seen > now() - interval '2 minutes',
         case when f.status = 'accepted' and p.last_seen > now() - interval '2 minutes' then p.playing end
  from public.friendships f
  join public.profiles p on p.id = case when f.a = auth.uid() then f.b else f.a end
  where auth.uid() in (f.a, f.b)
  order by 4, 5 desc, p.username
  limit 400;
$$;

-- Perfil de juego de cualquier usuario (solo con cuenta). En línea / jugando solo se ve si son amigos.
create function public.get_profile(p_username text) returns json
language plpgsql stable security definer set search_path = '' as $$
declare me uuid := auth.uid(); p public.profiles; rel text; friendly boolean;
begin
  if me is null then raise exception 'no autenticado' using errcode = '28000'; end if;
  select * into p from public.profiles where username = lower(p_username);
  if not found then return null; end if;
  select case when f.status = 'accepted' then 'amigo' when f.requested_by = me then 'enviada' else 'recibida' end into rel
    from public.friendships f where f.a = least(me, p.id) and f.b = greatest(me, p.id);
  friendly := p.id = me or rel = 'amigo';
  return json_build_object(
    'username', p.username, 'avatar', p.avatar, 'xp', p.xp, 'since', p.created_at, 'me', p.id = me, 'relation', rel,
    'online', case when friendly then p.last_seen > now() - interval '2 minutes' end,
    'playing', case when friendly and p.last_seen > now() - interval '2 minutes' then p.playing end,
    'friends', (select count(*) from public.friendships f where p.id in (f.a, f.b) and f.status = 'accepted'),
    'games', coalesce((select json_agg(json_build_object('game', g.game, 'w', g.w, 'l', g.l, 'd', g.d, 'seconds', coalesce(t.seconds, 0)))
       from (select s.game, sum(s.w) w, sum(s.l) l, sum(s.d) d from public.stats s where s.user_id = p.id group by s.game) g
       left join public.playtime t on t.user_id = p.id and t.game = g.game), '[]'::json),
    'chatarra_seconds', (select seconds from public.playtime where user_id = p.id and game = 'chatarra'));
end $$;

-- Permisos: solo lo necesario.
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
