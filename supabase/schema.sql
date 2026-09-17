-- Admission Journey MVP: anonymous-user-owned persistence.
-- Run this in the Supabase SQL Editor after enabling Anonymous Sign-Ins.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile jsonb not null check (jsonb_typeof(profile) = 'object'),
  step smallint not null check (step between 1 and 4),
  completed boolean not null default false,
  updated_at timestamptz not null
);

create table if not exists public.journey_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  selected_program_id text,
  compare_program_ids jsonb not null default '[]'::jsonb
    check (jsonb_typeof(compare_program_ids) = 'array'),
  completed_task_ids jsonb not null default '{}'::jsonb
    check (jsonb_typeof(completed_task_ids) = 'object'),
  updated_at timestamptz not null
);

alter table public.profiles enable row level security;
alter table public.journey_state enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
on public.profiles for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own profile" on public.profiles;
create policy "Users delete own profile"
on public.profiles for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users read own journey" on public.journey_state;
create policy "Users read own journey"
on public.journey_state for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users insert own journey" on public.journey_state;
create policy "Users insert own journey"
on public.journey_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update own journey" on public.journey_state;
create policy "Users update own journey"
on public.journey_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete own journey" on public.journey_state;
create policy "Users delete own journey"
on public.journey_state for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Explicit grants are required when newly created tables are not auto-exposed.
grant usage on schema public to authenticated;
revoke all on public.profiles from anon;
revoke all on public.journey_state from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.journey_state to authenticated;
