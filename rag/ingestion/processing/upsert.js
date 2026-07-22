import { chunkText } from './chunking.js';
import { createContentHash, normalizeText } from './text.js';

export async function upsertRagSource({ supabase, source, embeddings }) {
  const content = normalizeText(source.content);
  const chunks = chunkText(content);
  const chunkEmbeddings = embeddings ?? [];

  if (chunks.length === 0) {
    return { sourceId: null, chunkCount: 0 };
  }

  if (chunkEmbeddings.length !== chunks.length) {
    throw new Error(`Expected ${chunks.length} embeddings, received ${chunkEmbeddings.length}`);
  }

  const { data: sourceRow, error: sourceError } = await supabase
    .from('rag_sources')
    .upsert(
      {
        source_type: source.sourceType,
        source_key: source.sourceKey,
        title: source.title,
        url: source.url ?? null,
        path: source.path ?? null,
        metadata: source.metadata ?? {},
        content_hash: createContentHash(content),
      },
      { onConflict: 'source_type,source_key' }
    )
    .select('id')
    .single();

  if (sourceError) {
    throw sourceError;
  }

  const sourceId = sourceRow.id;

  const { error: deleteError } = await supabase
    .from('rag_chunks')
    .delete()
    .eq('source_id', sourceId);

  if (deleteError) {
    throw deleteError;
  }

  const rows = chunks.map((chunk, index) => ({
    source_id: sourceId,
    chunk_index: index,
    content: chunk,
    embedding: Array.isArray(chunkEmbeddings[index])
      ? toEmbeddingLiteral(chunkEmbeddings[index])
      : chunkEmbeddings[index],
    metadata: {
      ...(source.chunkMetadata ?? {}),
      char_count: chunk.length,
    },
  }));

  const { error: chunkError } = await supabase.from('rag_chunks').insert(rows);

  if (chunkError) {
    throw chunkError;
  }

  return { sourceId, chunkCount: rows.length };
}

export function toEmbeddingLiteral(values) {
  return `[${values.join(',')}]`;
}
