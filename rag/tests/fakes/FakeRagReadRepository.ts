import type { RagSourceOrigin } from '../../domain/content/RagSource.js';
import type { RetrievedContext } from '../../domain/retrieval/RetrievedContext.js';
import type {
  FindChunksByTextInput,
  FindSourcesInput,
  MatchChunksInput,
  RagReadRepository,
  RagSourceRecord,
} from '../../repositories/RagReadRepository.js';
import { resolveUrl } from '../../utils/url.js';
import type { ChunkFixture } from '../fixtures/sources.js';

const TEST_SITE_URL = 'https://arg.software';
const FIRST_PARTY_ORIGIN: RagSourceOrigin = 'first_party';

export interface FakeRagReadRepositoryFixtures {
  sources?: RagSourceRecord[];
  chunks?: ChunkFixture[];
  contexts?: RetrievedContext[];
}

export interface FakeRagReadRepositoryCalls {
  findSources: FindSourcesInput[];
  findFirstChunksForSources: RagSourceRecord[][];
  matchChunks: MatchChunksInput[];
  findChunksByText: FindChunksByTextInput[];
}

export class FakeRagReadRepository implements RagReadRepository {
  readonly calls: FakeRagReadRepositoryCalls = {
    findSources: [],
    findFirstChunksForSources: [],
    matchChunks: [],
    findChunksByText: [],
  };

  constructor(private readonly fixtures: FakeRagReadRepositoryFixtures = {}) {}

  async findSources(input: FindSourcesInput): Promise<RagSourceRecord[]> {
    this.calls.findSources.push(input);
    const sourceOrigin = input.sourceOrigin ?? FIRST_PARTY_ORIGIN;

    return (this.fixtures.sources ?? []).filter(
      source =>
        input.sourceTypes.includes(source.sourceType) &&
        source.origin === sourceOrigin &&
        source.isPublic
    );
  }

  async findFirstChunksForSources(sources: RagSourceRecord[]): Promise<RetrievedContext[]> {
    this.calls.findFirstChunksForSources.push(sources);
    const chunksBySourceId = new Map(
      (this.fixtures.chunks ?? [])
        .filter(chunk => chunk.chunkIndex === 0)
        .map(chunk => [chunk.sourceId, chunk])
    );

    return sources.flatMap(source => {
      const chunk = chunksBySourceId.get(source.id);
      return chunk ? [createDirectContext(source, chunk)] : [];
    });
  }

  async matchChunks(input: MatchChunksInput): Promise<RetrievedContext[]> {
    this.calls.matchChunks.push(input);

    return (this.fixtures.contexts ?? [])
      .filter(context => !input.sourceTypes || input.sourceTypes.includes(context.sourceType))
      .filter(context => !input.sourceKeys || input.sourceKeys.includes(context.sourceKey))
      .filter(context => context.origin === input.sourceOrigin)
      .map(resolveContextUrl);
  }

  async findChunksByText(input: FindChunksByTextInput): Promise<RetrievedContext[]> {
    this.calls.findChunksByText.push(input);
    const sourceOrigin = input.sourceOrigin ?? FIRST_PARTY_ORIGIN;
    const terms = input.terms.map(term => term.toLowerCase());

    return (this.fixtures.contexts ?? [])
      .filter(context => context.origin === sourceOrigin)
      .filter(context => !input.sourceTypes || input.sourceTypes.includes(context.sourceType))
      .filter(context => terms.some(term => context.content.toLowerCase().includes(term)))
      .slice(0, input.matchCount)
      .map(resolveContextUrl);
  }
}

function createDirectContext(source: RagSourceRecord, chunk: ChunkFixture): RetrievedContext {
  return {
    chunkId: chunk.id,
    sourceId: source.id,
    sourceType: source.sourceType,
    sourceKey: source.sourceKey,
    title: source.title,
    url: resolveUrl(source.url, TEST_SITE_URL),
    path: source.path,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    similarity: 1,
    sourceMetadata: source.metadata ?? {},
    chunkMetadata: chunk.metadata ?? {},
    origin: source.origin,
  };
}

function resolveContextUrl(context: RetrievedContext): RetrievedContext {
  return {
    ...context,
    url: resolveUrl(context.url, TEST_SITE_URL),
  };
}
