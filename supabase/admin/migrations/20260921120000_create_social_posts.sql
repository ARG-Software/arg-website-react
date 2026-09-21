create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  buffer_post_id text not null unique,
  text text not null,
  cover_image_url text,
  external_url text,
  published_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index social_posts_published_at_idx on public.social_posts (published_at desc);

create trigger set_social_posts_updated_at
before update on public.social_posts
for each row
execute function public.set_updated_at();

alter table public.social_posts enable row level security;

revoke all on public.social_posts from anon, authenticated;

grant all on public.social_posts to service_role;
