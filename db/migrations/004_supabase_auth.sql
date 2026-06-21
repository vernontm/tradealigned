-- Switch app_users from the Clerk-keyed shape to Supabase Auth.
-- Adds:
--   - auth_user_id  -> FK into auth.users
--   - role          -> 'user' | 'admin'
-- Loosens the old clerk_user_id constraint so existing demo rows survive.
-- Adds an auto-trigger so every new auth.users gets a matching app_users row.

alter table app_users
  alter column clerk_user_id drop not null;

alter table app_users
  add column if not exists auth_user_id uuid unique references auth.users(id) on delete cascade,
  add column if not exists role text not null default 'user'
    check (role in ('user', 'admin'));

create index if not exists app_users_auth_user_id_idx on app_users(auth_user_id);
create index if not exists app_users_role_idx on app_users(role);

-- Auto-create a row in app_users whenever a new auth.users is created.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_users (auth_user_id, email, email_verified, tier)
  values (
    new.id,
    new.email,
    new.email_confirmed_at is not null,
    'free'
  )
  on conflict (auth_user_id) do update
    set email = excluded.email,
        email_verified = excluded.email_verified;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- Promote Ray.
update public.app_users set role = 'admin' where email = 'ray@vernontm.com';

-- If Ray hasn't signed up yet, seed a placeholder row that will get linked
-- to auth.users by email match the moment he signs in. We do this by inserting
-- a minimal row keyed on email if no row exists.
insert into public.app_users (email, role, tier)
select 'ray@vernontm.com', 'admin', 'lifetime'
where not exists (
  select 1 from public.app_users where email = 'ray@vernontm.com'
);

-- Update the trigger to LINK pre-seeded rows (email match) instead of creating a new one.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
begin
  -- 1. Try to find an existing app_users row by email (admin seed pattern)
  select id into existing_id
  from public.app_users
  where lower(email) = lower(new.email) and auth_user_id is null
  limit 1;

  if existing_id is not null then
    update public.app_users
       set auth_user_id = new.id,
           email = new.email,
           email_verified = new.email_confirmed_at is not null
     where id = existing_id;
  else
    insert into public.app_users (auth_user_id, email, email_verified, tier)
    values (new.id, new.email, new.email_confirmed_at is not null, 'free')
    on conflict (auth_user_id) do update
      set email = excluded.email,
          email_verified = excluded.email_verified;
  end if;
  return new;
end;
$$;

-- RLS: lock down app_users so users only read their own row and admins see all.
alter table public.app_users enable row level security;

drop policy if exists "users read own row" on public.app_users;
create policy "users read own row" on public.app_users
  for select using (auth.uid() = auth_user_id);

drop policy if exists "admins read all" on public.app_users;
create policy "admins read all" on public.app_users
  for select using (
    exists (
      select 1 from public.app_users me
      where me.auth_user_id = auth.uid() and me.role = 'admin'
    )
  );

drop policy if exists "admins update all" on public.app_users;
create policy "admins update all" on public.app_users
  for update using (
    exists (
      select 1 from public.app_users me
      where me.auth_user_id = auth.uid() and me.role = 'admin'
    )
  );

-- Helper view that joins the auth user metadata with our app_users record
-- so the admin panel can show last_sign_in, sign_up date, etc.
create or replace view public.admin_users_view as
select
  u.id              as app_user_id,
  u.auth_user_id,
  u.email,
  u.role,
  u.tier,
  u.email_verified,
  u.stripe_customer_id,
  u.current_period_ends_at,
  u.created_at      as app_created_at,
  au.created_at     as auth_created_at,
  au.last_sign_in_at,
  au.email_confirmed_at
from public.app_users u
left join auth.users au on au.id = u.auth_user_id;
