-- -----------------------------------------------------------------------------
-- Profiles + admin-ready RLS (run in Supabase SQL Editor as a single script).
-- -----------------------------------------------------------------------------
-- Promote yourself to admin AFTER first signup (once the profile row exists):
--   UPDATE public.profiles SET role = 'admin' WHERE email = 'you@example.com';
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'user',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles no force row level security;

-- Fast lookup helpers (SECURITY DEFINER + NO FORCE RLS avoids recursion errors).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(trim(coalesce(p.role::text, ''))) = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_admin() to service_role;
alter function public.is_admin() owner to postgres;

-- New auth users automatically get profile row role = user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- Policies ---------------------------------------------------------------

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select"
  on public.profiles
  for select
  to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
  );

drop policy if exists "profiles_insert_self" on public.profiles;
-- Rows are created by trigger only (no INSERT policy for authenticated).

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
  on public.profiles
  for delete
  to authenticated
  using ((select public.is_admin()));

-- Optional sync: update profile email when user changes auth email ----------------
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
after update of email on auth.users
for each row
when (old.email is distinct from new.email)
execute procedure public.sync_profile_email();

-- Backfill profiles for accounts created before this migration (optional).
-- insert into public.profiles (id, email, role)
-- select au.id, au.email, 'user'
-- from auth.users au
-- left join public.profiles p on p.id = au.id
-- where p.id is null
-- on conflict (id) do nothing;
