-- Upgrade an existing single-user install to authenticated, per-user access.
-- First create your Supabase Auth user in the dashboard. Replace the email below
-- with that account's email, then run this whole file in the SQL editor.

begin;

alter table public.trades add column if not exists last_traded_price numeric;
alter table public.trades add column if not exists user_id uuid references auth.users (id) on delete cascade;

do $$
declare
  owner_email text := 'REPLACE_WITH_YOUR_SUPABASE_LOGIN_EMAIL';
  owner_id uuid;
begin
  select id into owner_id from auth.users where lower(email) = lower(owner_email);
  if owner_id is null then
    raise exception 'No Supabase Auth user found for %. Create the user first, then set owner_email.', owner_email;
  end if;
  update public.trades set user_id = owner_id where user_id is null;
end
$$;

alter table public.trades alter column user_id set default auth.uid();
alter table public.trades alter column user_id set not null;

create table if not exists public.account_settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  starting_capital numeric not null default 0
);

create index if not exists trades_user_id_idx on public.trades (user_id);

alter table public.trades enable row level security;
alter table public.account_settings enable row level security;

-- Remove every existing trade policy so no permissive legacy rule can bypass ownership.
do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'trades' loop
    execute format('drop policy %I on public.trades', p.policyname);
  end loop;
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'account_settings' loop
    execute format('drop policy %I on public.account_settings', p.policyname);
  end loop;
end
$$;

revoke all on table public.trades, public.account_settings from anon, authenticated;
grant select, insert, update, delete on table public.trades, public.account_settings to authenticated;

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

commit;
