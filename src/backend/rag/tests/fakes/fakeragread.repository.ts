import type { RagSourceOrigin } from '../../domain/sources/ragsource.types.js';
import type { IRetrievedContext } from '../../domain/sources/retrievedcontext.types.js';
import type { IRagReadRepositories } from '../../application/ports/iragread.repository.js';
import type { RagChunkRecord } from '../../application/ports/iragchunk.repository.js';
import type { IFindChunksByTextInput, IMatchChunksInput } from '../../application/ports/iragchunksearch.repository.js';
import type { IFindRagSourcesInput, RagSourceRecord } from '../../application/ports/iragsource.repository.js';
import type { IChunkFixture } from '../fixtures/sources.js';

const FIRST_PARTY_ORIGIN: RagSourceOrigin = 'first_party';

export interface IFakeRagReadRepositoryFixtures {
  sources?: RagSourceRecord[];
  chunks?: IChunkFixture[];
  contexts?: IRetrievedContext[];
}

export interface IFakeRagReadRepositoryCalls {
  findSources: IFindRagSourcesInput[];
  findFirstChunksForSources: RagSourceRecord[][];
  matchChunks: IMatchChunksInput[];
  findChunksByText: IFindChunksByTextInput[];
}

export class FakeRagReadRepository implements IRagReadRepositories {
  readonly calls: IFakeRagReadRepositoryCalls = {
    findSources: [],
    findFirstChunksForSources: [],
    matchChunks: [],
    findChunksByText: [],
  };

  readonly sourceRepository = {
    findByKey: async () => null,
    findPublicByTypes: (input: IFindRagSourcesInput) => this.findSources(input),
  };

  readonly chunkRepository = {
    findBySourceId: async (sourceId: string) =>
      this.chunkRecords().filter(chunk => chunk.sourceId === sourceId),
    findFirstBySourceIds: (sourceIds: string[]) => this.findFirstChunksBySourceIds(sourceIds),
    count: async () => this.chunkRecords().length,
    listPage: async (offset: number, pageSize: number) =>
      this.chunkRecords().slice(offset, offset + pageSize),
  };

  readonly chunkSearchRepository = {
    matchChunks: (input: IMatchChunksInput) => this.matchChunks(input),
    findChunksByText: (input: IFindChunksByTextInput) => this.findChunksByText(input),
  };

  constructor(private readonly fixtures: IFakeRagReadRepositoryFixtures = {}) {}

  private async findSources(input: IFindRagSourcesInput): Promise<RagSourceRecord[]> {
    this.calls.findSources.push(input);
    const sourceOrigin = input.sourceOrigin ?? FIRST_PARTY_ORIGIN;

    return (this.fixtures.sources ?? []).filter(
      source =>
        input.sourceTypes.includes(source.sourceType) &&
        source.origin === sourceOrigin &&
        source.isPublic
    );
  }

  private async findFirstChunksBySourceIds(sourceIds: string[]) {
    const sources = (this.fixtures.sources ?? []).filter(source => sourceIds.includes(source.id));
    this.calls.findFirstChunksForSources.push(sources);

    return this.chunkRecords()
      .filter(chunk => sourceIds.includes(chunk.sourceId))
      .filter(chunk => chunk.chunkIndex === 0);
  }

  private chunkRecords(): RagChunkRecord[] {
    return (this.fixtures.chunks ?? []).map(chunk => ({
      id: chunk.id,
      sourceId: chunk.sourceId,
      chunkIndex: chunk.chunkIndex,
      content: chunk.content,
      metadata: chunk.metadata,
    }));
  }

  private async matchChunks(input: IMatchChunksInput) {
    this.calls.matchChunks.push(input);

    return (this.fixtures.contexts ?? [])
      .filter(context => !input.sourceTypes || input.sourceTypes.includes(context.sourceType))
      .filter(context => !input.sourceKeys || input.sourceKeys.includes(context.sourceKey))
      .filter(context => context.origin === input.sourceOrigin)
      .map(toMatchedChunkRecord);
  }

  private async findChunksByText(input: IFindChunksByTextInput) {
    this.calls.findChunksByText.push(input);
    const sourceOrigin = input.sourceOrigin ?? FIRST_PARTY_ORIGIN;
    const terms = input.terms.map(term => term.toLowerCase());

    return (this.fixtures.contexts ?? [])
      .filter(context => context.origin === sourceOrigin)
      .filter(context => !input.sourceTypes || input.sourceTypes.includes(context.sourceType))
      .filter(context => terms.some(term => context.content.toLowerCase().includes(term)))
      .slice(0, input.matchCount)
      .map(toMatchedChunkRecord);
  }
}

function toMatchedChunkRecord(context: IRetrievedContext) {
  return {
    chunkId: context.chunkId,
    sourceId: context.sourceId,
    sourceType: context.sourceType,
    sourceKey: context.sourceKey,
    title: context.title,
    url: context.url,
    path: context.path,
    chunkIndex: context.chunkIndex,
    content: context.content,
    similarity: context.similarity,
    sourceMetadata: context.sourceMetadata,
    chunkMetadata: context.chunkMetadata,
    origin: context.origin,
  };
}
