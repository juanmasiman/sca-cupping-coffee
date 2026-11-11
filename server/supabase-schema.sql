-- lento — cloud tables
--
-- Run this in the Supabase SQL editor. It is safe to run again: every
-- statement either creates what is missing or replaces a policy with an
-- identical one. Nothing here drops a table or touches a row, so running
-- it on a project that already holds cupping history is a no-op for that
-- history.

-- ------------------------------------------------------------
-- cuppings — the cupping sheet's own history
--
-- Shaped for a cupping: `date` is here because a session happens on a day
-- and the history is read by day.

create table if not exists public.cuppings (
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  date bigint not null,
  updated bigint not null,
  data jsonb not null,
  primary key (user_id, id)
);

-- Row Level Security: users can only ever see and touch their own rows.
-- Without it, the anon key that ships in the client reads the whole table.
alter table public.cuppings enable row level security;

drop policy if exists "select own cuppings" on public.cuppings;
create policy "select own cuppings" on public.cuppings
  for select using (auth.uid() = user_id);

drop policy if exists "insert own cuppings" on public.cuppings;
create policy "insert own cuppings" on public.cuppings
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own cuppings" on public.cuppings;
create policy "update own cuppings" on public.cuppings
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own cuppings" on public.cuppings;
create policy "delete own cuppings" on public.cuppings
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- records — the dial-in, the brew log, and whatever comes next
--
-- WHY A SECOND TABLE
--
-- A shot and a brew are not a cupping's shape, and there will be a fourth
-- tool. Widening `cuppings` means a migration over live rows that can only
-- go wrong once; a second, generic table costs a create statement.
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

create table if not exists public.records (
  tool text not null,
  id text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  updated bigint not null,
  data jsonb not null,
  primary key (user_id, tool, id)
);

alter table public.records enable row level security;

drop policy if exists "select own records" on public.records;
create policy "select own records" on public.records
  for select using (auth.uid() = user_id);

drop policy if exists "insert own records" on public.records;
create policy "insert own records" on public.records
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own records" on public.records;
create policy "update own records" on public.records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "delete own records" on public.records;
create policy "delete own records" on public.records
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- limits
--
-- The anon key is public and anyone can sign up, so a signed-in account is
-- not a trusted one. Without a ceiling, one account could push rows of any
-- size and fill the project's storage for everybody. A cupping with ten
-- coffees is a few kilobytes; 256 KB per row is far past anything the apps
-- write. NOT VALID: checked on every new write, never against rows that
-- are already there, so running this cannot fail on existing history.
--
-- `with check` on the update policies above says out loud what Postgres
-- already did implicitly: an update cannot move a row to another account.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'cuppings_limits') then
    alter table public.cuppings add constraint cuppings_limits check (
      pg_column_size(data) < 262144 and char_length(id) <= 128
    ) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'records_limits') then
    alter table public.records add constraint records_limits check (
      pg_column_size(data) < 262144 and char_length(id) <= 128 and char_length(tool) <= 32
    ) not valid;
  end if;
end $$;
