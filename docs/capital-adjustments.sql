-- Run once in the Supabase SQL editor to enable account deposits and withdrawals.
create extension if not exists "pgcrypto";

create table if not exists public.capital_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  direction text not null check (direction in ('add', 'withdraw')),
  amount numeric not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index if not exists capital_adjustments_user_created_idx
  on public.capital_adjustments (user_id, created_at);

alter table public.capital_adjustments enable row level security;
revoke all on table public.capital_adjustments from anon, authenticated;
grant select, insert on table public.capital_adjustments to authenticated;

drop policy if exists "Users can read their capital adjustments" on public.capital_adjustments;
drop policy if exists "Users can create their capital adjustments" on public.capital_adjustments;

create policy "Users can read their capital adjustments" on public.capital_adjustments
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can create their capital adjustments" on public.capital_adjustments
  for insert to authenticated with check ((select auth.uid()) = user_id);
