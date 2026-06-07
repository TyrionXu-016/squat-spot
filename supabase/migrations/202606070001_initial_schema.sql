create extension if not exists pgcrypto;
create extension if not exists postgis;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'checkin_status') then
    create type public.checkin_status as enum ('smooth', 'normal', 'hard');
  end if;

  if not exists (select 1 from pg_type where typname = 'location_mode') then
    create type public.location_mode as enum ('none', 'fuzzy', 'precise');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  openid text not null unique,
  nickname text,
  avatar_url text,
  created_at timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint tags_name_not_blank check (length(trim(name)) > 0),
  constraint tags_slug_not_blank check (length(trim(slug)) > 0)
);

create unique index if not exists tags_default_slug_unique
  on public.tags(slug)
  where user_id is null;

create unique index if not exists tags_user_slug_unique
  on public.tags(user_id, slug)
  where user_id is not null;

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status public.checkin_status not null,
  note text,
  location_mode public.location_mode not null default 'none',
  place_name text,
  lat double precision,
  lng double precision,
  geom geography(point, 4326),
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint checkins_note_length check (note is null or length(note) <= 240),
  constraint checkins_place_name_length check (place_name is null or length(place_name) <= 120),
  constraint checkins_coordinate_bounds check (
    (
      location_mode = 'none'
      and lat is null
      and lng is null
      and geom is null
    )
    or
    (
      location_mode in ('fuzzy', 'precise')
      and lat between -90 and 90
      and lng between -180 and 180
      and geom is not null
    )
  )
);

create index if not exists checkins_user_checked_at_idx
  on public.checkins(user_id, checked_at desc)
  where deleted_at is null;

create index if not exists checkins_user_status_idx
  on public.checkins(user_id, status)
  where deleted_at is null;

create index if not exists checkins_geom_gix
  on public.checkins using gist(geom)
  where deleted_at is null and geom is not null;

create table if not exists public.checkin_tags (
  checkin_id uuid not null references public.checkins(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (checkin_id, tag_id)
);

create index if not exists checkin_tags_tag_id_idx
  on public.checkin_tags(tag_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists checkins_set_updated_at on public.checkins;
create trigger checkins_set_updated_at
before update on public.checkins
for each row
execute function public.set_updated_at();

alter table public.users enable row level security;
alter table public.tags enable row level security;
alter table public.checkins enable row level security;
alter table public.checkin_tags enable row level security;

insert into public.tags (name, slug, sort_order)
values
  ('顺畅', 'smooth', 10),
  ('一般', 'normal', 20),
  ('艰难', 'hard', 30),
  ('家里', 'home', 40),
  ('公司', 'office', 50),
  ('旅行中', 'travel', 60),
  ('火锅后', 'hotpot', 70),
  ('咖啡后', 'coffee', 80)
on conflict do nothing;
