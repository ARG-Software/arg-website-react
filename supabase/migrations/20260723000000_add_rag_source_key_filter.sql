drop function if exists public.match_rag_chunks(
  extensions.vector,
  integer,
  double precision,
  text[]
);

create function public.match_rag_chunks(
  query_embedding extensions.vector(768),
  match_count integer default 6,
  similarity_threshold double precision default 0.72,
  source_types text[] default null,
  source_keys text[] default null
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
    and (source_keys is null or s.source_key = any(source_keys))
    and 1 - (c.embedding operator(extensions.<=>) query_embedding) >= similarity_threshold
  order by c.embedding operator(extensions.<=>) query_embedding
  limit greatest(match_count, 0);
$$;

revoke execute on function public.match_rag_chunks(
  extensions.vector,
  integer,
  double precision,
  text[],
  text[]
) from public, anon, authenticated;

grant execute on function public.match_rag_chunks(
  extensions.vector,
  integer,
  double precision,
  text[],
  text[]
) to service_role;
