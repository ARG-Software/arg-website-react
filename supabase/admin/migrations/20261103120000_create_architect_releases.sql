create table public.architect_releases (
  id uuid primary key default gen_random_uuid(),
  github_id text not null unique,
  tag_name text not null,
  name text not null,
  body text not null,
  html_url text not null,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index architect_releases_published_at_idx on public.architect_releases (published_at desc);

create trigger set_architect_releases_updated_at
before update on public.architect_releases
for each row
execute function public.set_updated_at();

alter table public.architect_releases enable row level security;

revoke all on public.architect_releases from anon, authenticated;

grant all on public.architect_releases to service_role;
