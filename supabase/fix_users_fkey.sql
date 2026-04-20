-- ============================================================================
-- SafeTag: fix signup "users_id_fkey" error + 401/409 errors
-- ============================================================================
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> RUN
-- It is idempotent: safe to run multiple times.
-- ----------------------------------------------------------------------------
-- What it does:
--   1. Ensures public.users.id is a FK to auth.users(id) with ON DELETE CASCADE.
--   2. Installs a trigger on auth.users that auto-creates the matching
--      public.users row the instant Supabase Auth creates the user. This
--      eliminates the foreign-key race / 401 / 409 on signup.
--   3. Re-creates clean, minimal RLS policies so an authenticated user can
--      read and update their own row (no manual INSERT needed any more).
-- ============================================================================

-- 0. Make sure RLS is on.
alter table public.users enable row level security;

-- 1. (Re)create the FK with ON DELETE CASCADE. Drop first if it exists.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'users'
      and constraint_name = 'users_id_fkey'
  ) then
    alter table public.users drop constraint users_id_fkey;
  end if;
end$$;

alter table public.users
  add constraint users_id_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- 2. Trigger function: auto-insert a public.users row when an auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Re-create the trigger cleanly.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. RLS policies. Drop any old ones with the same names first.
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;

create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- INSERT policy kept for compatibility if you still insert from the client.
-- With the trigger above you don't actually need it, but it doesn't hurt.
create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

-- 4. Grants (Supabase usually has these, but make sure).
grant usage on schema public to anon, authenticated;
grant select, insert, update on public.users to authenticated;

-- ============================================================================
-- Done. Now in your client code, replace the .insert(...) on users with an
-- .upsert(...) or .update(...).  See supabase/CLIENT_CHANGES.md.
-- ============================================================================
