import type { ArchitectRelease } from '../../../domain/types/architectrelease.types.js';

export type ArchitectReleaseListQuery = {
  page: number;
  pageSize: number;
};

export type ArchitectReleaseListResult = {
  records: ArchitectRelease[];
  totalRecords: number;
};

export interface IArchitectReleaseRepository {
  list(query: ArchitectReleaseListQuery): Promise<ArchitectReleaseListResult>;
  upsertMany(releases: ArchitectRelease[]): Promise<number>;
}
