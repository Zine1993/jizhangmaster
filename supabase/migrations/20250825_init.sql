-- Enable required extension
create extension if not exists "pgcrypto";

-- Enum for transaction type
do $$
begin
  if not exists (select 1 from pg_type where typname = 'transaction_type') then
    create type transaction_type as enum ('income','expense');
  end if;
end $$;

-- User settings
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  language text not null default 'zh' check (language in ('en','zh','es','fr','de','ja','ko')),
  currency text not null default 'CNY' check (char_length(currency) = 3),
  theme text not null default 'system' check (theme in ('light','dark','system')),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "users select own settings" on public.user_settings
  for select using (auth.uid() = user_id);

create policy "users insert own settings" on public.user_settings
  for insert with check (auth.uid() = user_id);

create policy "users update own settings" on public.user_settings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users delete own settings" on public.user_settings
  for delete using (auth.uid() = user_id);

-- Transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type transaction_type not null,
  amount numeric(12,2) not null check (amount >= 0),
  category text not null,
  description text,
  occurred_at timestamptz not null default now(),
  currency text not null check (char_length(currency) = 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists idx_tx_user on public.transactions(user_id);
create index if not exists idx_tx_user_date on public.transactions(user_id, occurred_at desc);
create index if not exists idx_tx_user_type on public.transactions(user_id, type);

alter table public.transactions enable row level security;

create policy "users select own transactions" on public.transactions
  for select using (auth.uid() = user_id);

create policy "users insert own transactions" on public.transactions
  for insert with check (auth.uid() = user_id);

create policy "users update own transactions" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "users delete own transactions" on public.transactions
  for delete using (auth.uid() = user_id);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row execute procedure public.set_updated_at();

-- Auto-create settings row for new auth users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Grants (RLS still applies)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.transactions to anon, authenticated;
grant select, insert, update, delete on public.user_settings to anon, authenticated;