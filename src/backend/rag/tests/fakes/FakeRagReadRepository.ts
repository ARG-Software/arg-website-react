import type { RagSourceOrigin } from '../../domain/content/IRagSource.js';
import type { IRetrievedContext } from '../../domain/retrieval/IRetrievedContext.js';
import type {
  IFindChunksByTextInput,
  IFindSourcesInput,
  IMatchChunksInput,
  IRagReadRepository,
  IRagSourceRecord,
} from '../../application/ports/IRagReadRepository.js';
import { resolveUrl } from '../../application/common/url.js';
import type { IChunkFixture } from '../fixtures/sources.js';

const TEST_SITE_URL = 'https://arg.software';
const FIRST_PARTY_ORIGIN: RagSourceOrigin = 'first_party';

export interface IFakeRagReadRepositoryFixtures {
  sources?: IRagSourceRecord[];
  chunks?: IChunkFixture[];
  contexts?: IRetrievedContext[];
}

export interface IFakeRagReadRepositoryCalls {
  findSources: IFindSourcesInput[];
  findFirstChunksForSources: IRagSourceRecord[][];
  matchChunks: IMatchChunksInput[];
  findChunksByText: IFindChunksByTextInput[];
}

export class FakeRagReadRepository implements IRagReadRepository {
  readonly calls: IFakeRagReadRepositoryCalls = {
    findSources: [],
    findFirstChunksForSources: [],
    matchChunks: [],
    findChunksByText: [],
  };

  constructor(private readonly fixtures: IFakeRagReadRepositoryFixtures = {}) {}

  async findSources(input: IFindSourcesInput): Promise<IRagSourceRecord[]> {
    this.calls.findSources.push(input);
    const sourceOrigin = input.sourceOrigin ?? FIRST_PARTY_ORIGIN;

    return (this.fixtures.sources ?? []).filter(
      source =>
        input.sourceTypes.includes(source.sourceType) &&
        source.origin === sourceOrigin &&
        source.isPublic
    );
  }

  async findFirstChunksForSources(sources: IRagSourceRecord[]): Promise<IRetrievedContext[]> {
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

  async matchChunks(input: IMatchChunksInput): Promise<IRetrievedContext[]> {
    this.calls.matchChunks.push(input);

    return (this.fixtures.contexts ?? [])
      .filter(context => !input.sourceTypes || input.sourceTypes.includes(context.sourceType))
      .filter(context => !input.sourceKeys || input.sourceKeys.includes(context.sourceKey))
      .filter(context => context.origin === input.sourceOrigin)
      .map(resolveContextUrl);
  }

  async findChunksByText(input: IFindChunksByTextInput): Promise<IRetrievedContext[]> {
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

function createDirectContext(source: IRagSourceRecord, chunk: IChunkFixture): IRetrievedContext {
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

function resolveContextUrl(context: IRetrievedContext): IRetrievedContext {
  return {
    ...context,
    url: resolveUrl(context.url, TEST_SITE_URL),
  };
}
