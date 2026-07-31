import type { RagConfig } from '../../../../core/types/config.js';
import type { RetrievedContext } from '../../../../core/types/context.js';
import type { EmbeddingProvider } from '../../../../domain/providers/ProviderPorts.js';
import type { RagSourceMetadata } from '../../../../core/types/source.js';
import type { RagReadRepository, RagSourceRecord } from '../../../../repositories/RagReadRepository.js';
import { resolveSemanticSearch, type SemanticSearchInput } from '../embeddings.js';
import { normalizeName } from '../technology/normalizeTechnology.js';
import { mergeComplementaryContexts, retrieveContextsForOrigin } from '../vectorSearch.js';

const FIRST_PARTY_ORIGIN = 'first_party';
const BROAD_PERSON_PROFILE_PATTERN =
  /\b(?:background|bio|biography|career|education|experience|profile|stud(?:y|ies)|who is|tell me about)\b/iu;
const PROFESSIONAL_BACKGROUND_PATTERN =
  /\b(?:background|career|education|experience|professional|stud(?:y|ies)|work)\b/iu;
const COMPANY_ORIGIN_PATTERN = /\b(?:founded|founder|origin|started|start|began|begin|created)\b/iu;

export function isBroadPersonProfileSubject(subject: string): boolean {
  return BROAD_PERSON_PROFILE_PATTERN.test(subject);
}

export async function findPersonSource(
  readRepository: RagReadRepository,
  entity: string
): Promise<RagSourceRecord | null> {
  const sources = await readRepository.findSources({ sourceTypes: ['about'] });
  const people = sources.filter(source => getPersonKey(source.metadata));
  const entityName = normalizeName(entity);
  const matches = people.filter(source => normalizeName(source.title) === entityName);

  if (matches.length === 1) {
    return matches[0];
  }

  const firstNameMatches = people.filter(
    source => normalizeName(source.title).split(' ')[0] === entityName
  );
  return firstNameMatches.length === 1 ? firstNameMatches[0] : null;
}

export async function retrieveBroadPersonProfileContexts({
  readRepository,
  config,
  person,
  subject,
  embeddingProvider,
  fallbackEmbeddingProvider,
  semanticSearch,
}: {
  readRepository: RagReadRepository;
  config: RagConfig;
  person: RagSourceRecord;
  subject: string;
  embeddingProvider: EmbeddingProvider;
  fallbackEmbeddingProvider: EmbeddingProvider;
  semanticSearch?: SemanticSearchInput;
}): Promise<RetrievedContext[]> {
  const sources = [person];

  if (asksCompanyOrigin(subject)) {
    const aboutSource = await findAboutSource(readRepository);
    if (aboutSource) {
      sources.push(aboutSource);
    }
  }

  if (asksProfessionalBackground(subject)) {
    sources.push(...(await findPersonDocuments(readRepository, person)));
  }

  const uniqueProfileSources = uniqueSources(sources);
  const search = await resolveSemanticSearch(
    subject,
    embeddingProvider,
    fallbackEmbeddingProvider,
    semanticSearch
  );
  const semanticContexts = await retrieveSemanticEvidenceForSourceKeys(
    readRepository,
    config,
    search,
    uniqueProfileSources.map(source => source.sourceKey)
  );
  const anchorContexts = await readRepository.findFirstChunksForSources(uniqueProfileSources);

  return mergeComplementaryContexts([semanticContexts, anchorContexts], config.matchCount);
}

export async function retrievePersonSemanticEvidence(
  readRepository: RagReadRepository,
  config: RagConfig,
  person: RagSourceRecord,
  search: SemanticSearchInput
): Promise<RetrievedContext[]> {
  const documents = await findPersonDocuments(readRepository, person);
  return retrieveSemanticEvidenceForSourceKeys(
    readRepository,
    config,
    search,
    [person, ...documents].map(source => source.sourceKey)
  );
}

async function retrieveSemanticEvidenceForSourceKeys(
  readRepository: RagReadRepository,
  config: RagConfig,
  search: SemanticSearchInput,
  sourceKeys: string[]
): Promise<RetrievedContext[]> {
  if (sourceKeys.length === 0) {
    return [];
  }

  return retrieveContextsForOrigin({
    repository: readRepository,
    embedding: search.embedding,
    index: search.index,
    config,
    sourceOrigin: FIRST_PARTY_ORIGIN,
    sourceKeys,
  });
}

async function findPersonDocuments(
  readRepository: RagReadRepository,
  person: RagSourceRecord
): Promise<RagSourceRecord[]> {
  const personKey = getPersonKey(person.metadata);
  if (!personKey) {
    return [];
  }

  const documents = await readRepository.findSources({ sourceTypes: ['local_document'] });
  return documents.filter(source => source.metadata?.person_key === personKey);
}

async function findAboutSource(readRepository: RagReadRepository): Promise<RagSourceRecord | null> {
  const sources = await readRepository.findSources({ sourceTypes: ['about'] });
  return sources.find(source => source.sourceKey === 'about') ?? null;
}

function asksProfessionalBackground(subject: string): boolean {
  return PROFESSIONAL_BACKGROUND_PATTERN.test(subject);
}

function asksCompanyOrigin(subject: string): boolean {
  return COMPANY_ORIGIN_PATTERN.test(subject);
}

function uniqueSources(sources: RagSourceRecord[]): RagSourceRecord[] {
  const seen = new Set<string>();
  return sources.filter(source => {
    if (seen.has(source.id)) {
      return false;
    }

    seen.add(source.id);
    return true;
  });
}

function getPersonKey(metadata: RagSourceMetadata | null | undefined): string | null {
  return typeof metadata?.person_key === 'string' ? metadata.person_key : null;
}
