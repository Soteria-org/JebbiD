create extension if not exists pgcrypto;

create type public.user_role as enum ('investor','finance_officer','super_admin');
create type public.account_status as enum ('invited','active','suspended');
create type public.kyc_status as enum ('not_started','pending','approved','rejected');

-- Generic updated_at helper, reused by every table below
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- One profile row per auth.users row, for every role.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'investor',
  member_id text unique,
  full_name text not null,
  email text not null,
  phone text,
  must_change_password boolean not null default false,
  account_status public.account_status not null default 'active',
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per authenticated user (investor, finance_officer, super_admin). role + account_status + must_change_password drive the admin-created-account onboarding flow.';

-- Member IDs (JBD-2026-000145 style) are DB-generated to avoid client-side collisions.
create sequence public.member_id_seq start 1;

create or replace function public.generate_member_id()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role = 'investor' and new.member_id is null then
    new.member_id := 'JBD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.member_id_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

create trigger trg_generate_member_id
before insert on public.profiles
for each row execute function public.generate_member_id();

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Investor-only detail fields, kept off the shared profiles table.
create table public.investor_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  national_id_number text,
  address text,
  occupation text,
  financial_goal text,
  next_of_kin_name text,
  next_of_kin_phone text,
  next_of_kin_relationship text,
  kyc_status public.kyc_status not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_investor_details_updated_at
before update on public.investor_details
for each row execute function public.set_updated_at();

-- Finance-officer / admin-only metadata (who created them, notes).
create table public.staff_details (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  created_by uuid references public.profiles(id),
  department text,
  notes text,
  created_at timestamptz not null default now()
);
