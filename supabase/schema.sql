-- Fresh install for the private Trading Journal.
-- Each signed-in user owns their rows. Signed-out access is revoked.

create extension if not exists "pgcrypto";

create table if not exists public.trades (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cap_adjustment    numeric,
  type              text not null check (type in ('L', 'S')),
  contract          text not null check (contract in ('I', 'D')),
  symbol            text not null,
  lots              numeric not null,
  lot_size          numeric not null,
  buy_date          date,
  buy_price         numeric,
  sell_date         date,
  sell_price        numeric,
  last_traded_price numeric,
  initial_stop      numeric not null,
  is_sell_open      boolean not null default false,
  is_buy_open       boolean not null default false,
  entry_time        time not null,
  exit_time         time,
  notes             text,
  created_at        timestamptz not null default now()
);

create table if not exists public.account_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  starting_capital numeric not null default 0
);

create index if not exists trades_created_at_idx on public.trades (created_at);
create index if not exists trades_user_id_idx on public.trades (user_id);

alter table public.trades enable row level security;
alter table public.account_settings enable row level security;

revoke all on table public.trades, public.account_settings from anon, authenticated;
grant select, insert, update, delete on table public.trades, public.account_settings to authenticated;

drop policy if exists "Users can read their trades" on public.trades;
drop policy if exists "Users can create their trades" on public.trades;
drop policy if exists "Users can update their trades" on public.trades;
drop policy if exists "Users can delete their trades" on public.trades;
drop policy if exists "Users can read their settings" on public.account_settings;
drop policy if exists "Users can create their settings" on public.account_settings;
drop policy if exists "Users can update their settings" on public.account_settings;

create policy "Users can read their trades" on public.trades
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their trades" on public.trades
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their trades" on public.trades
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Users can delete their trades" on public.trades
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read their settings" on public.account_settings
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their settings" on public.account_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Users can update their settings" on public.account_settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
