-- lento — cloud tables
--
-- Run this in the Supabase SQL editor. Nothing here drops or alters an
-- existing table, so re-running is safe in the only sense that matters:
-- it fails loudly on "already exists" and changes nothing.

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


-- ------------------------------------------------------------
-- records — the dial-in and the brew log
--
-- WHY A SECOND TABLE
--
-- `cuppings` is shaped for a cupping: it has a `date` column because a
-- cupping session happens on a day and the history is read by day. A shot
-- and a brew are not that shape, and there will be a fourth tool. Widening
-- `cuppings` means a migration over live rows that can only go wrong once;
-- a second, generic table costs a create statement.
--
-- `tool` is the tool's own name ('espresso', 'filter', 'kit'), `id` is
-- whatever that tool already calls the record locally, and `data` is the
-- record verbatim. The primary key is the three of them together, so one
-- account can hold the same id in two tools without collision, and a
-- second push of the same record updates rather than duplicates.
--
-- `updated` is epoch milliseconds and it is what decides a conflict:
-- newest write wins, per record. That is a real cost, not a technicality
-- — two devices editing the SAME record while both offline will lose one
-- of the two edits. It is chosen deliberately over a merge that would
-- silently interleave two people's numbers into a shot neither of them
-- pulled.

create table public.records (
  tool text not null,
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  updated bigint not null,
  data jsonb not null,
  primary key (user_id, tool, id)
);

-- Row Level Security: same rule as cuppings. Without this, the anon key
-- that ships in the client would read every row in the table.
alter table public.records enable row level security;

create policy "select own records" on public.records
  for select using (auth.uid() = user_id);

create policy "insert own records" on public.records
  for insert with check (auth.uid() = user_id);

create policy "update own records" on public.records
  for update using (auth.uid() = user_id);

create policy "delete own records" on public.records
  for delete using (auth.uid() = user_id);
