import type { IRagSource, RagSourceMetadata, RagSourceOrigin, RagSourceType } from '../../domain/sources/ragsource.types.js';

export type RagSourceIdentity = Pick<IRagSource, 'sourceType' | 'sourceKey'>;

export interface IFindRagSourcesInput {
  sourceTypes: RagSourceType[];
  sourceOrigin?: RagSourceOrigin;
}

export type RagSourceRecord = {
  id: string;
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  url: string | null;
  path: string | null;
  origin: RagSourceOrigin;
  isPublic: boolean;
  metadata: RagSourceMetadata | null;
  contentHash: string | null;
};

export type RagSourceUpsertRecord = {
  sourceType: RagSourceType;
  sourceKey: string;
  title: string;
  url: string | null;
  path: string | null;
  origin: RagSourceOrigin;
  isPublic: boolean;
  metadata: RagSourceMetadata;
  contentHash: string;
};

export interface IRagSourceReadRepository {
  findByKey(source: RagSourceIdentity): Promise<RagSourceRecord | null>;
  findPublicByTypes(input: IFindRagSourcesInput): Promise<RagSourceRecord[]>;
}

export interface IRagSourceWriteRepository {
  upsert(source: RagSourceUpsertRecord): Promise<string>;
}
