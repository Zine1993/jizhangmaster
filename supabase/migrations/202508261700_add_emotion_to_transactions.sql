-- Add emotion column to transactions table (nullable)
alter table if exists public.transactions
  add column if not exists emotion text;