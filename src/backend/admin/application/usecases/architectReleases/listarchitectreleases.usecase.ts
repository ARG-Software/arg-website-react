import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type {
  ArchitectRelease,
  ArchitectReleaseListItem,
} from '../../../domain/types/architectrelease.types.js';
import type { IArchitectReleaseRepository } from '../../ports/repositories/iarchitectrelease.repository.js';
import { createPagination, getPagination } from '../pagination.js';

const EXCERPT_LENGTH = 180;
const MAX_PAGE_SIZE = 100;

export interface ListArchitectReleasesInput {
  page?: string | number;
  pageSize?: string | number;
}

export class ListArchitectReleasesUseCase {
  constructor(
    private readonly architectReleaseRepository: IArchitectReleaseRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(input: ListArchitectReleasesInput = {}) {
    const pagination = getPagination(input, { maxPageSize: MAX_PAGE_SIZE });
    this.logger?.info('Architect releases list use case started', pagination);
    const result = await this.architectReleaseRepository.list(pagination);
    this.logger?.info('Architect releases list use case completed', {
      recordCount: result.records.length,
      totalRecords: result.totalRecords,
    });

    return {
      records: result.records.map(createArchitectReleaseListItem),
      pagination: createPagination(pagination.page, pagination.pageSize, result.totalRecords),
    };
  }
}

function createArchitectReleaseListItem(release: ArchitectRelease): ArchitectReleaseListItem {
  return {
    id: release.id || release.githubId,
    githubId: release.githubId,
    tagName: release.tagName,
    name: release.name,
    excerpt: createExcerpt(release.body),
    body: release.body,
    htmlUrl: release.htmlUrl,
    publishedAt: release.publishedAt,
  };
}

function createExcerpt(text: string): string {
  const value = String(text || '').trim();
  if (value.length <= EXCERPT_LENGTH) return value;

  return `${value.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…`;
}
