-- Create emotion_tags table and link to transactions
-- Safe to run multiple times if not exists checks are used carefully

-- 1) extension for gen_random_uuid (if not exists)
create extension if not exists pgcrypto;

-- 2) emotion_tags table
create table if not exists public.emotion_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  emoji text not null,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgname = 'emotion_tags_set_updated_at'
  ) then
    create trigger emotion_tags_set_updated_at
    before update on public.emotion_tags
    for each row execute function public.set_updated_at();
  end if;
end $$;

-- 4) add emotion_tag_id to transactions (nullable), keep existing emotion text
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='transactions' and column_name='emotion_tag_id'
  ) then
    alter table public.transactions
      add column emotion_tag_id uuid null;
  end if;
exception when undefined_table then
  -- transactions table may not exist yet; ignore so migration doesn't fail hard
  null;
end $$;

-- add fk if transactions exists and column exists and constraint not exists
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public' and table_name='transactions' and column_name='emotion_tag_id'
  ) and not exists (
    select 1 from pg_constraint
    where conname = 'transactions_emotion_tag_id_fkey'
  ) then
    alter table public.transactions
      add constraint transactions_emotion_tag_id_fkey
      foreign key (emotion_tag_id) references public.emotion_tags(id) on delete set null;
  end if;
exception when undefined_table then
  null;
end $$;

-- 5) seed defaults if table empty
do $$
begin
  if (select count(*) from public.emotion_tags) = 0 then
    insert into public.emotion_tags (name, emoji, sort_order) values
      ('开心','😀',10),
      ('满足','😊',20),
      ('期待','✨',30),
      ('平静','😌',40),
      ('焦虑','😟',50),
      ('沮丧','😞',60),
      ('犒赏自己','🎉',70),
      ('孤单','😔',80),
      ('无聊','😐',90),
      ('难过','😭',100),
      ('兴奋','😆',110),
      ('感激','🙏',120),
      ('放松','🧘',130),
      ('紧张','😕',140),
      ('生气','😠',150);
  end if;
end $$;

-- 6) restore defaults function (truncate and re-seed)
create or replace function public.restore_default_emotion_tags()
returns void
language plpgsql
as $$
begin
  delete from public.emotion_tags;
  insert into public.emotion_tags (name, emoji, sort_order) values
      ('开心','😀',10),
      ('满足','😊',20),
      ('期待','✨',30),
      ('平静','😌',40),
      ('焦虑','😟',50),
      ('沮丧','😞',60),
      ('犒赏自己','🎉',70),
      ('孤单','😔',80),
      ('无聊','😐',90),
      ('难过','😭',100),
      ('兴奋','😆',110),
      ('感激','🙏',120),
      ('放松','🧘',130),
      ('紧张','😕',140),
      ('生气','😠',150);
end;
$$;