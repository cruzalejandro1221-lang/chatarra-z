-- Giorgio Games · panel del dueño y estadísticas de uso (también de invitados, de forma anónima).
-- Invitados: solo un identificador aleatorio del dispositivo (no nombre, ni correo, ni IP), tipo de equipo,
-- última conexión, juego en curso y minutos por juego. El panel solo lo ven las cuentas de la tabla admins,
-- que no se puede modificar desde la app (sin permisos ni políticas para anon/authenticated).

-- ------------------------------------------------------------------ administradores
create table public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ------------------------------------------------------------------ uso por dispositivo
create table public.devices (
  id          uuid primary key,
  user_id     uuid references auth.users (id) on delete set null,
  platform    text not null default 'pc' check (platform in ('android','ios','pc')),
  installed   boolean not null default false,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  playing     text check (playing in ('ajedrez','poker','batalla','ludo','chatarra')),
  opens       integer not null default 1
);
create index devices_last_seen on public.devices (last_seen desc);

create table public.device_time (
  device  uuid not null references public.devices (id) on delete cascade,
  day     date not null default current_date,
  game    text not null check (game in ('app','ajedrez','poker','batalla','ludo','chatarra')),
  seconds integer not null default 0,
  primary key (device, day, game)
);
create index device_time_day on public.device_time (day);

alter table public.devices     enable row level security;
alter table public.device_time enable row level security;
revoke all on public.devices, public.device_time from anon, authenticated;

-- Latido de cualquier visitante (con o sin cuenta). El tiempo lo mide el reloj del servidor (máx. 2 min por latido).
create function public.ping(p_device uuid, p_game text default null, p_platform text default 'pc', p_installed boolean default false, p_open boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare d public.devices; uid uuid := auth.uid(); g text := coalesce(p_game, 'app');
begin
  if p_device is null then return; end if;
  if p_game is not null and p_game not in ('ajedrez','poker','batalla','ludo','chatarra') then return; end if;
  if p_platform not in ('android','ios','pc') then p_platform := 'pc'; end if;
  select * into d from public.devices where id = p_device;
  if not found then
    insert into public.devices (id, user_id, platform, installed, playing) values (p_device, uid, p_platform, coalesce(p_installed, false), p_game);
  else
    if not p_open and d.last_seen > now() - interval '15 seconds' and d.playing is not distinct from p_game then return; end if;
    if d.last_seen > now() - interval '3 minutes' then
      insert into public.device_time (device, game, seconds)
        values (p_device, coalesce(d.playing, 'app'), least(extract(epoch from now() - d.last_seen)::int, 120))
        on conflict (device, day, game) do update set seconds = public.device_time.seconds + excluded.seconds;
    end if;
    update public.devices set last_seen = now(), playing = p_game, platform = p_platform, installed = coalesce(p_installed, false),
      user_id = coalesce(uid, user_id), opens = opens + (case when p_open then 1 else 0 end)
      where id = p_device;
  end if;
  if uid is not null then perform public.heartbeat(p_game); end if;
end $$;

-- ------------------------------------------------------------------ funciones del panel (solo administradores)
create function public.admin_overview() returns json
language plpgsql stable security definer set search_path = '' as $$
declare r json;
begin
  if not public.is_admin() then raise exception 'solo administradores' using errcode = '42501'; end if;
  select json_build_object(
    'users_total',   (select count(*) from public.profiles),
    'users_7d',      (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'online_users',  (select count(*) from public.devices where last_seen > now() - interval '2 minutes' and user_id is not null),
    'online_guests', (select count(*) from public.devices where last_seen > now() - interval '2 minutes' and user_id is null),
    'devices_total', (select count(*) from public.devices),
    'active_today',  (select count(*) from public.devices where last_seen >= date_trunc('day', now())),
    'active_7d',     (select count(*) from public.devices where last_seen > now() - interval '7 days'),
    'installed',     (select count(*) from public.devices where installed),
    'platforms',     (select coalesce(json_object_agg(platform, n), '{}'::json) from (select platform, count(*) n from public.devices group by platform) x),
    'playing_now',   (select coalesce(json_object_agg(coalesce(playing, 'menu'), n), '{}'::json) from (select playing, count(*) n from public.devices where last_seen > now() - interval '2 minutes' group by playing) x),
    'matches_total', (select count(*) from public.matches),
    'matches_today', (select count(*) from public.matches where created_at >= date_trunc('day', now())),
    'matches_by_game', (select coalesce(json_object_agg(game, n), '{}'::json) from (select game, count(*) n from public.matches group by game) x),
    'minutes_7d_by_game', (select coalesce(json_object_agg(game, m), '{}'::json) from (select game, round(sum(seconds) / 60.0) m from public.device_time where day > current_date - 7 group by game) x),
    'friendships',   (select count(*) from public.friendships where status = 'accepted'),
    'daily', (select json_agg(json_build_object('day', d::date,
                 'new_users', (select count(*) from public.profiles where created_at::date = d::date),
                 'devices',   (select count(distinct device) from public.device_time where day = d::date),
                 'minutes',   (select coalesce(round(sum(seconds) / 60.0), 0) from public.device_time where day = d::date),
                 'matches',   (select count(*) from public.matches where created_at::date = d::date)) order by d)
              from generate_series(current_date - 13, current_date, interval '1 day') d)
  ) into r;
  return r;
end $$;

-- Lista de usuarios con cuenta (con correo: solo para el dueño, para dar soporte).
create function public.admin_users(p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns table (username text, avatar text, email text, provider text, created_at timestamptz, last_seen timestamptz,
               online boolean, playing text, xp integer, wins bigint, matches bigint, minutes bigint, friends bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'solo administradores' using errcode = '42501'; end if;
  return query
  select p.username, p.avatar, u.email::text, coalesce(u.raw_app_meta_data ->> 'provider', 'email'), p.created_at, p.last_seen,
         coalesce(p.last_seen > now() - interval '2 minutes', false), case when p.last_seen > now() - interval '2 minutes' then p.playing end,
         p.xp,
         (select coalesce(sum(s.w), 0) from public.stats s where s.user_id = p.id),
         (select count(*) from public.matches m where m.user_id = p.id),
         (select coalesce(sum(t.seconds), 0) / 60 from public.playtime t where t.user_id = p.id),
         (select count(*) from public.friendships f where p.id in (f.a, f.b) and f.status = 'accepted')
  from public.profiles p join auth.users u on u.id = p.id
  where p_search is null or p_search = '' or p.username ilike '%' || p_search || '%' or u.email ilike '%' || p_search || '%'
  order by p.last_seen desc nulls last, p.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0);
end $$;

-- Quién está conectado ahora mismo (cuentas e invitados).
create function public.admin_live()
returns table (who text, avatar text, platform text, installed boolean, playing text, since timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'solo administradores' using errcode = '42501'; end if;
  return query
  select coalesce(p.username, 'Invitado'), coalesce(p.avatar, '👤'), d.platform, d.installed, d.playing, d.first_seen
  from public.devices d left join public.profiles p on p.id = d.user_id
  where d.last_seen > now() - interval '2 minutes'
  order by d.playing nulls last, d.last_seen desc
  limit 300;
end $$;

-- ------------------------------------------------------------------ permisos
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.leaderboard(integer) to anon, authenticated;
grant execute on function public.ping(uuid, text, text, boolean, boolean) to anon, authenticated;
grant execute on function public.record_match(text, text, smallint, text) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.set_username(text) to authenticated;
grant execute on function public.heartbeat(text) to authenticated;
grant execute on function public.friend_request(text) to authenticated;
grant execute on function public.friend_respond(text, boolean) to authenticated;
grant execute on function public.friend_remove(text) to authenticated;
grant execute on function public.my_friends() to authenticated;
grant execute on function public.get_profile(text) to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.admin_overview() to authenticated;
grant execute on function public.admin_users(text, integer, integer) to authenticated;
grant execute on function public.admin_live() to authenticated;
