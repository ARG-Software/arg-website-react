import type { SupabaseClient } from '@supabase/supabase-js';

import type { EmbeddingProvider, RetrievedContext } from '../../types/ai.js';
import type { RagConfig } from '../../types/config.js';
import type { RagSourceMetadata, RagSourceOrigin, RagSourceType } from '../../types/source.js';
import { createQueryEmbedding } from './embeddings.js';
import {
  DIRECT_EVIDENCE_SOURCE_TYPES,
  FAQ_SOURCE_TYPES,
  OFFICIAL_WEBSITE_SOURCE_TYPES,
  TRUSTED_EXTERNAL_SOURCE_TYPES,
  type RetrievalRoute,
} from './route.js';
import { createDirectContext, retrieveFirstChunksForSources, retrieveSources } from './sources.js';
import type { DirectChunkRow, DirectSourceRow } from './types.js';
import { retrieveContextsForOrigin } from './vectorSearch.js';

const FIRST_PARTY_ORIGIN = 'first_party';
const TRUSTED_EXTERNAL_ORIGIN = 'trusted_external';

export async function retrieveDirectEvidenceContexts({
  supabase,
  config,
  route,
  embeddingProvider,
  fallbackEmbeddingProvider,
}: {
  supabase: SupabaseClient;
  config: RagConfig;
  route: RetrievalRoute;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
}): Promise<RetrievedContext[]> {
  const person = route.entity ? await findPersonSource(supabase, route.entity) : null;

  if (!route.subject && route.entity) {
    const entitySource = person ?? (await findDirectSource(supabase, route.entity));
    return entitySource ? retrieveFirstChunksForSources(supabase, config, [entitySource]) : [];
  }

  const officialEvidence = route.subject
    ? await retrieveTextEvidence(supabase, config, OFFICIAL_WEBSITE_SOURCE_TYPES, route.subject)
    : [];
  const faqEvidence = route.subject
    ? await retrieveTextEvidence(supabase, config, FAQ_SOURCE_TYPES, route.subject)
    : [];
  const trustedExternalEvidence = route.subject
    ? await retrieveTextEvidence(
        supabase,
        config,
        TRUSTED_EXTERNAL_SOURCE_TYPES,
        route.subject,
        TRUSTED_EXTERNAL_ORIGIN
      )
    : [];
  const personalEvidence = person && route.subject
    ? await retrievePersonDocumentEvidence(supabase, config, person, route.subject)
    : [];
  const directEvidence = mergePrioritizedContexts(
    [officialEvidence, faqEvidence, trustedExternalEvidence, personalEvidence],
    config.matchCount
  );

  if (person || directEvidence.length > 0) {
    return directEvidence;
  }

  return retrieveSemanticEvidence(
    supabase,
    config,
    route.subject,
    embeddingProvider,
    fallbackEmbeddingProvider
  );
}

async function findPersonSource(
  supabase: SupabaseClient,
  entity: string
): Promise<DirectSourceRow | null> {
  const sources = await retrieveSources(supabase, ['about']);
  const people = sources.filter(source => getPersonKey(source.metadata));
  const entityName = normalizeEntityName(entity);
  const matches = people.filter(source => normalizeEntityName(source.title) === entityName);

  if (matches.length === 1) {
    return matches[0];
  }

  const firstNameMatches = people.filter(source =>
    normalizeEntityName(source.title).split(' ')[0] === entityName
  );
  return firstNameMatches.length === 1 ? firstNameMatches[0] : null;
}

async function findDirectSource(
  supabase: SupabaseClient,
  entity: string
): Promise<DirectSourceRow | null> {
  const entityName = normalizeEntityName(entity);
  const matches = (await retrieveSources(supabase, DIRECT_EVIDENCE_SOURCE_TYPES)).filter(
    source => normalizeEntityName(source.title) === entityName
  );
  return matches.length === 1 ? matches[0] : null;
}

async function retrievePersonDocumentEvidence(
  supabase: SupabaseClient,
  config: RagConfig,
  person: DirectSourceRow,
  subject: string
): Promise<RetrievedContext[]> {
  const personKey = getPersonKey(person.metadata);
  if (!personKey) {
    return [];
  }

  const documents = (await retrieveSources(supabase, ['local_document'])).filter(
    source => source.metadata?.person_key === personKey
  );
  return retrieveTextEvidenceFromSources(supabase, config, documents, subject);
}

async function retrieveTextEvidence(
  supabase: SupabaseClient,
  config: RagConfig,
  sourceTypes: RagSourceType[],
  subject: string,
  sourceOrigin: RagSourceOrigin = FIRST_PARTY_ORIGIN
): Promise<RetrievedContext[]> {
  return retrieveTextEvidenceFromSources(
    supabase,
    config,
    await retrieveSources(supabase, sourceTypes, sourceOrigin),
    subject
  );
}

async function retrieveTextEvidenceFromSources(
  supabase: SupabaseClient,
  config: RagConfig,
  sources: DirectSourceRow[],
  subject: string
): Promise<RetrievedContext[]> {
  if (sources.length === 0 || !subject) {
    return [];
  }

  const { data, error } = await supabase
    .from('rag_chunks')
    .select('id, source_id, chunk_index, content, metadata')
    .in(
      'source_id',
      sources.map(source => source.id)
    )
    .order('chunk_index');

  if (error) {
    throw error;
  }

  const sourcesById = new Map(sources.map(source => [source.id, source]));
  return ((data ?? []) as DirectChunkRow[])
    .filter(chunk => containsSubject(chunk.content, subject))
    .flatMap(chunk => {
      const source = sourcesById.get(chunk.source_id);
      return source ? [createDirectContext(source, chunk, config)] : [];
    })
    .slice(0, config.matchCount);
}

async function retrieveSemanticEvidence(
  supabase: SupabaseClient,
  config: RagConfig,
  subject: string,
  embeddingProvider: EmbeddingProvider,
  fallbackEmbeddingProvider: EmbeddingProvider
): Promise<RetrievedContext[]> {
  if (!subject) {
    return [];
  }

  const { embedding, matchFunction } = await createQueryEmbedding(
    subject,
    embeddingProvider,
    fallbackEmbeddingProvider
  );
  const officialEvidence = await retrieveContextsForOrigin({
    supabase,
    embedding,
    config,
    matchFunction,
    sourceOrigin: FIRST_PARTY_ORIGIN,
    sourceTypes: OFFICIAL_WEBSITE_SOURCE_TYPES,
  });
  const faqEvidence = await retrieveContextsForOrigin({
    supabase,
    embedding,
    config,
    matchFunction,
    sourceOrigin: FIRST_PARTY_ORIGIN,
    sourceTypes: FAQ_SOURCE_TYPES,
  });
  const trustedExternalEvidence = await retrieveContextsForOrigin({
    supabase,
    embedding,
    config,
    matchFunction,
    sourceOrigin: TRUSTED_EXTERNAL_ORIGIN,
    sourceTypes: TRUSTED_EXTERNAL_SOURCE_TYPES,
  });

  return mergePrioritizedContexts(
    [officialEvidence, faqEvidence, trustedExternalEvidence],
    config.matchCount
  );
}

function mergePrioritizedContexts(
  contextGroups: RetrievedContext[][],
  matchCount: number
): RetrievedContext[] {
  const contextsByChunk = new Map<string, RetrievedContext>();

  for (const context of contextGroups.flat()) {
    if (!contextsByChunk.has(context.chunkId)) {
      contextsByChunk.set(context.chunkId, context);
    }
  }

  return Array.from(contextsByChunk.values()).slice(0, matchCount);
}

function containsSubject(content: string, subject: string): boolean {
  const escapedSubject = subject.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
  return new RegExp(`(^|[^a-z0-9])${escapedSubject}(?=$|[^a-z0-9])`, 'iu').test(content);
}

function getPersonKey(metadata: RagSourceMetadata | null | undefined): string | null {
  return typeof metadata?.person_key === 'string' ? metadata.person_key : null;
}

function normalizeEntityName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();
}
