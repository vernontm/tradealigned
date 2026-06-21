-- Stripe wiring. Run in Supabase SQL editor.
-- App users table is already in the base schema; we just relax constraints for
-- the no-Clerk demo phase (email is the identity) and add a top-up credits
-- balance column so one-time purchases land somewhere.

alter table app_users alter column clerk_user_id drop not null;
alter table app_users add column if not exists topup_credits int not null default 0;

-- Tier value gets an extra option for the one-time lifetime purchase
-- (schema already lists 'lifetime' in the CHECK constraint, no-op if matches).

create unique index if not exists app_users_email_uniq on app_users(lower(email));
create index if not exists app_users_stripe_customer_idx on app_users(stripe_customer_id);
