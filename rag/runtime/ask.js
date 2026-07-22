import { generateAnswer } from '../clients/deepseek.js';
import { embedText } from '../clients/gemini.js';
import { createSupabaseServiceClient } from '../clients/supabaseClient.js';
import { getRagConfig } from '../config/env.js';
import { toEmbeddingLiteral } from '../ingestion/processing/upsert.js';

export async function askQuestion({
  question,
  sourceTypes,
  config = getRagConfig(),
  supabase = createSupabaseServiceClient(config),
} = {}) {
  const normalizedQuestion = normalizeQuestion(question);
  const contexts = await retrieveRelevantChunks({
    question: normalizedQuestion,
    sourceTypes,
    config,
    supabase,
  });

  if (contexts.length === 0) {
    return {
      answer:
        'I do not have enough information to answer that from the available ARG Software context.',
      citations: [],
      contexts: [],
    };
  }

  const answer = await generateAnswer({
    question: normalizedQuestion,
    contexts,
    config,
  });

  return {
    answer,
    citations: createCitations(contexts, config.siteUrl),
    contexts,
  };
}

export async function retrieveRelevantChunks({
  question,
  sourceTypes,
  config = getRagConfig(),
  supabase = createSupabaseServiceClient(config),
} = {}) {
  const normalizedQuestion = normalizeQuestion(question);
  const embedding = await embedText(normalizedQuestion, config);
  const { data, error } = await supabase.rpc('match_rag_chunks', {
    query_embedding: toEmbeddingLiteral(embedding),
    match_count: config.matchCount,
    similarity_threshold: config.similarityThreshold,
    source_types: normalizeSourceTypes(sourceTypes),
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map(row => ({
    chunkId: row.chunk_id,
    sourceId: row.source_id,
    sourceType: row.source_type,
    sourceKey: row.source_key,
    title: row.title,
    url: resolveUrl(row.url, config.siteUrl),
    path: row.path,
    chunkIndex: row.chunk_index,
    content: row.content,
    similarity: row.similarity,
    sourceMetadata: row.source_metadata ?? {},
    chunkMetadata: row.chunk_metadata ?? {},
  }));
}

function createCitations(contexts, siteUrl) {
  const seen = new Set();
  const citations = [];

  for (const context of contexts) {
    const key = context.url || `${context.sourceType}:${context.sourceKey}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    citations.push({
      title: context.title,
      url: context.url ?? resolveUrl(context.path, siteUrl),
      sourceType: context.sourceType,
      sourceKey: context.sourceKey,
    });
  }

  return citations;
}

function normalizeQuestion(question) {
  if (typeof question !== 'string') {
    throw new Error('Question is required');
  }

  const normalizedQuestion = question.trim();

  if (!normalizedQuestion) {
    throw new Error('Question is required');
  }

  if (normalizedQuestion.length > 1000) {
    throw new Error('Question must be 1000 characters or fewer');
  }

  return normalizedQuestion;
}

function normalizeSourceTypes(sourceTypes) {
  if (!sourceTypes) {
    return null;
  }

  if (!Array.isArray(sourceTypes)) {
    throw new Error('sourceTypes must be an array');
  }

  const normalized = sourceTypes.map(sourceType => String(sourceType).trim()).filter(Boolean);
  return normalized.length > 0 ? normalized : null;
}

function resolveUrl(url, siteUrl) {
  if (!url) {
    return null;
  }

  try {
    return new URL(url, siteUrl).toString();
  } catch {
    return url;
  }
}
