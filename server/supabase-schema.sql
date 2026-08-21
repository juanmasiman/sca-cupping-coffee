-- SCA Cupping — cloud history table
-- Run this in the Supabase SQL editor (one time).

create table public.cuppings (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  date bigint not null,
  updated bigint not null,
  data jsonb not null,
  primary key (user_id, id)
);

-- Row Level Security: users can only ever see and touch their own rows.
alter table public.cuppings enable row level security;

create policy "select own cuppings" on public.cuppings
  for select using (auth.uid() = user_id);

create policy "insert own cuppings" on public.cuppings
  for insert with check (auth.uid() = user_id);

create policy "update own cuppings" on public.cuppings
  for update using (auth.uid() = user_id);

create policy "delete own cuppings" on public.cuppings
  for delete using (auth.uid() = user_id);
