-- =====================================================================
-- Migration 0001 — Plataforma de Sorteios
-- Banco: Neon / PostgreSQL
--
-- COMO USAR:
--   1. Abra o SQL Editor do seu projeto no Neon.
--   2. Cole este arquivo INTEIRO e rode.
--   3. Troque a senha do admin (veja o bloco no final).
--
-- Idempotente: pode ser rodado mais de uma vez sem quebrar.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Extensão: gen_random_uuid() (UUIDs) e crypt()/gen_salt() (bcrypt)
-- ---------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos (enums)
-- ---------------------------------------------------------------------
do $$ begin
  create type raffle_type as enum ('numbers', 'names');   -- tipo do sorteio
exception when duplicate_object then null; end $$;

do $$ begin
  create type raffle_status as enum ('draft', 'open', 'drawn', 'closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type slot_status as enum ('available', 'taken');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Helper: mantém updated_at sempre atualizado
-- ---------------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- ADMINS — login do painel (usuário + senha no banco)
-- ---------------------------------------------------------------------
create table if not exists admins (
  id            uuid primary key default gen_random_uuid(),
  username      text        not null unique,
  password_hash text        not null,                 -- hash bcrypt
  name          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

drop trigger if exists trg_admins_updated on admins;
create trigger trg_admins_updated before update on admins
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- RAFFLES — os sorteios criados pelo admin
--   type        -> 'numbers' ou 'names'
--   total_slots -> quantidade de números/nomes a sortear
--   draw_date   -> data do sorteio
-- ---------------------------------------------------------------------
create table if not exists raffles (
  id           uuid          primary key default gen_random_uuid(),
  title        text          not null,
  description  text,
  type         raffle_type   not null,
  total_slots  integer       not null check (total_slots > 0),
  draw_date    timestamptz,
  status       raffle_status not null default 'open',
  created_by   uuid          references admins(id) on delete set null,
  created_at   timestamptz   not null default now(),
  updated_at   timestamptz   not null default now()
);

drop trigger if exists trg_raffles_updated on raffles;
create trigger trg_raffles_updated before update on raffles
  for each row execute function set_updated_at();

create index if not exists idx_raffles_status    on raffles(status);
create index if not exists idx_raffles_draw_date on raffles(draw_date);

-- ---------------------------------------------------------------------
-- RAFFLE_PRIZES — prêmios do sorteio
--   A "quantidade de prêmios" = número de linhas aqui.
--   position = ordem (1º, 2º, 3º ...)
-- ---------------------------------------------------------------------
create table if not exists raffle_prizes (
  id          uuid        primary key default gen_random_uuid(),
  raffle_id   uuid        not null references raffles(id) on delete cascade,
  position    integer     not null,
  description text        not null,
  created_at  timestamptz not null default now(),
  unique (raffle_id, position)
);

create index if not exists idx_prizes_raffle on raffle_prizes(raffle_id);

-- ---------------------------------------------------------------------
-- RAFFLE_SLOTS — os números OU nomes do sorteio
--   label       -> "1","2",...  (numbers)  ou  "João","Maria",... (names)
--   status      -> 'available' (disponível p/ o usuário ver) | 'taken'
--   Quando o admin MARCA, gravamos aqui: raffle_id (FK), telefone,
--   nome do comprador e o próprio número/nome (label).
-- ---------------------------------------------------------------------
create table if not exists raffle_slots (
  id          uuid        primary key default gen_random_uuid(),
  raffle_id   uuid        not null references raffles(id) on delete cascade,
  position    integer     not null,
  label       text        not null,
  status      slot_status not null default 'available',
  buyer_name  text,                                   -- nome de quem comprou
  buyer_phone text,                                   -- telefone de quem comprou
  marked_by   uuid        references admins(id) on delete set null,
  marked_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (raffle_id, position),
  unique (raffle_id, label),
  -- Integridade: só é 'taken' se tiver comprador; se 'available', sem dados de compra.
  check (
    (status = 'available' and buyer_name is null and buyer_phone is null and marked_at is null)
    or
    (status = 'taken'     and buyer_name is not null and buyer_phone is not null)
  )
);

create index if not exists idx_slots_raffle        on raffle_slots(raffle_id);
create index if not exists idx_slots_raffle_status on raffle_slots(raffle_id, status);
create index if not exists idx_slots_phone         on raffle_slots(buyer_phone);

-- ---------------------------------------------------------------------
-- RAFFLE_WINNERS — ganhadores (preenchido no dia do sorteio) [opcional]
-- ---------------------------------------------------------------------
create table if not exists raffle_winners (
  id         uuid        primary key default gen_random_uuid(),
  raffle_id  uuid        not null references raffles(id) on delete cascade,
  prize_id   uuid        not null references raffle_prizes(id) on delete cascade,
  slot_id    uuid        not null references raffle_slots(id) on delete cascade,
  drawn_at   timestamptz not null default now(),
  unique (prize_id)          -- cada prêmio tem no máximo um ganhador
);

-- ---------------------------------------------------------------------
-- Helper: gera os slots numéricos (1..N) de um sorteio de tipo 'numbers'.
--   Use no app após criar o sorteio:  select generate_number_slots('<uuid>', 100);
--   (Para 'names', o app insere os nomes informados pelo admin.)
-- ---------------------------------------------------------------------
create or replace function generate_number_slots(p_raffle uuid, p_count int)
returns void as $$
begin
  insert into raffle_slots (raffle_id, position, label)
  select p_raffle, gs, gs::text
  from generate_series(1, p_count) as gs
  on conflict (raffle_id, position) do nothing;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- ADMIN INICIAL
--   Usuário: admin
--   Senha:   admin123   <<<  TROQUE ISSO!  >>>
--
--   Para trocar a senha depois, rode:
--     update admins set password_hash = crypt('SUA_NOVA_SENHA', gen_salt('bf'))
--     where username = 'admin';
-- ---------------------------------------------------------------------
insert into admins (username, password_hash, name)
values ('admin', crypt('admin123', gen_salt('bf')), 'Administrador')
on conflict (username) do nothing;

commit;
