import { geminiFallbackEmbeddingClient } from '../clients/gemini.js';
import { createSupabaseServiceClient } from '../clients/supabaseClient.js';
import { loadLocalEnv } from '../config/loadLocalEnv.js';
import { toEmbeddingLiteral } from '../utils/embeddings.js';

const PAGE_SIZE = 100;

interface RagChunkRow {
  id: string;
  content: string;
}

loadLocalEnv();

const supabase = createSupabaseServiceClient();
const chunkCount = await getChunkCount();

if (chunkCount === 0) {
  console.log('No RAG chunks found. Nothing to rebuild.');
  process.exit(0);
}

console.log(`Clearing Model 1 embeddings for ${chunkCount} chunks.`);
const { error: clearError } = await supabase
  .from('rag_chunks')
  .update({ fallback_embedding: null })
  .not('id', 'is', null);

if (clearError) {
  throw clearError;
}

let offset = 0;
let rebuiltCount = 0;

while (offset < chunkCount) {
  const chunks = await loadChunkPage(offset);

  if (chunks.length === 0) {
    break;
  }

  const embeddings = await geminiFallbackEmbeddingClient.embedTexts(
    chunks.map(chunk => chunk.content)
  );

  const updates = await Promise.all(
    chunks.map((chunk, index) =>
      supabase
        .from('rag_chunks')
        .update({ fallback_embedding: toEmbeddingLiteral(embeddings[index]) })
        .eq('id', chunk.id)
    )
  );
  const updateError = updates.find(result => result.error)?.error;

  if (updateError) {
    throw updateError;
  }

  rebuiltCount += chunks.length;
  offset += chunks.length;
  console.log(`Rebuilt ${rebuiltCount}/${chunkCount} Model 1 embeddings.`);
}

if (rebuiltCount !== chunkCount) {
  throw new Error(`Expected to rebuild ${chunkCount} chunks, rebuilt ${rebuiltCount}`);
}

console.log(`Rebuilt all ${rebuiltCount} Model 1 embeddings from stored chunk content.`);

async function getChunkCount(): Promise<number> {
  const { count, error } = await supabase
    .from('rag_chunks')
    .select('*', { count: 'exact', head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function loadChunkPage(offset: number): Promise<RagChunkRow[]> {
  const { data, error } = await supabase
    .from('rag_chunks')
    .select('id, content')
    .order('id')
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    throw error;
  }

  return (data ?? []) as RagChunkRow[];
}
