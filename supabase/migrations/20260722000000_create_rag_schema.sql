create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.rag_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (
    source_type in (
      'homepage',
      'about',
      'project',
      'partner',
      'careers',
      'working_with_us',
      'faq',
      'blog_post',
      'portfolio_pdf',
      'external_page'
    )
  ),
  source_key text not null,
  title text not null,
  url text,
  path text,
  metadata jsonb not null default '{}'::jsonb,
  content_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_key)
);

create table public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.rag_sources(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null,
  embedding extensions.vector(768) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, chunk_index)
);

create index rag_sources_source_type_idx on public.rag_sources (source_type);
create index rag_sources_source_key_idx on public.rag_sources (source_key);
create index rag_chunks_source_id_idx on public.rag_chunks (source_id);
create index rag_chunks_embedding_idx on public.rag_chunks
  using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_rag_sources_updated_at
before update on public.rag_sources
for each row
execute function public.set_updated_at();

create trigger set_rag_chunks_updated_at
before update on public.rag_chunks
for each row
execute function public.set_updated_at();

alter table public.rag_sources enable row level security;
alter table public.rag_chunks enable row level security;

create or replace function public.match_rag_chunks(
  query_embedding extensions.vector(768),
  match_count integer default 6,
  similarity_threshold double precision default 0.72,
  source_types text[] default null
)
returns table (
  chunk_id uuid,
  source_id uuid,
  source_type text,
  source_key text,
  title text,
  url text,
  path text,
  chunk_index integer,
  content text,
  similarity double precision,
  source_metadata jsonb,
  chunk_metadata jsonb
)
language sql
stable
as $$
  select
    c.id as chunk_id,
    s.id as source_id,
    s.source_type,
    s.source_key,
    s.title,
    s.url,
    s.path,
    c.chunk_index,
    c.content,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity,
    s.metadata as source_metadata,
    c.metadata as chunk_metadata
  from public.rag_chunks c
  join public.rag_sources s on s.id = c.source_id
  where (source_types is null or s.source_type = any(source_types))
    and 1 - (c.embedding operator(extensions.<=>) query_embedding) >= similarity_threshold
  order by c.embedding operator(extensions.<=>) query_embedding
  limit greatest(match_count, 0);
$$;

revoke all on public.rag_sources from anon, authenticated;
revoke all on public.rag_chunks from anon, authenticated;
revoke execute on function public.match_rag_chunks(extensions.vector, integer, double precision, text[]) from public, anon, authenticated;

grant all on public.rag_sources to service_role;
grant all on public.rag_chunks to service_role;
grant execute on function public.match_rag_chunks(extensions.vector, integer, double precision, text[]) to service_role;
