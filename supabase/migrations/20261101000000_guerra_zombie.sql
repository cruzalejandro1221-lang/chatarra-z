-- Guerra Zombie: partida guardada en la nube (una por cuenta). Solo el dueño la lee y la escribe, siempre por funciones.
create table if not exists public.gz_saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  day        integer not null default 1 check (day between 1 and 100000),
  best       integer not null default 0 check (best between 0 and 100000),
  mode       text not null default 'normal' check (mode in ('normal', 'dificil')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gz_saves_size check (octet_length(data::text) <= 200000)
);
alter table public.gz_saves enable row level security;
-- sin políticas: nadie la toca directo; solo las funciones de abajo (security definer, con auth.uid()).
revoke all on public.gz_saves from anon, authenticated;

create or replace function public.gz_load() returns jsonb
language sql stable security definer set search_path = public as $$
  select data from public.gz_saves where user_id = auth.uid();
$$;

create or replace function public.gz_save(p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_day int; v_best int; v_mode text;
begin
  if auth.uid() is null then raise exception 'sin sesión' using errcode = '28000'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'datos inválidos' using errcode = '22023'; end if;
  v_day  := greatest(1, least(100000, coalesce((p_data->>'day')::int, 1)));
  v_best := greatest(0, least(100000, coalesce((p_data->>'best')::int, 0)));
  v_mode := case when p_data->>'mode' = 'dificil' then 'dificil' else 'normal' end;
  insert into public.gz_saves as s (user_id, data, day, best, mode)
  values (auth.uid(), p_data, v_day, v_best, v_mode)
  on conflict (user_id) do update set data = excluded.data, day = excluded.day,
    best = greatest(s.best, excluded.best), mode = excluded.mode, updated_at = now();
end;
$$;

revoke all on function public.gz_load() from public, anon;
revoke all on function public.gz_save(jsonb) from public, anon;
grant execute on function public.gz_load() to authenticated;
grant execute on function public.gz_save(jsonb) to authenticated;
