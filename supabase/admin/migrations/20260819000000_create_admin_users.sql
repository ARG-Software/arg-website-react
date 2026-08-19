create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_email_lowercase_check check (email = lower(email)),
  constraint admin_users_role_check check (role in ('owner', 'admin'))
);

create unique index admin_users_email_lower_idx on public.admin_users (lower(email));
create index admin_users_active_idx on public.admin_users (is_active) where is_active = true;

create trigger set_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.set_updated_at();

alter table public.admin_users enable row level security;

revoke all on public.admin_users from anon, authenticated;
grant all on public.admin_users to service_role;
