import type { ILogger } from '../../../../shared/logger/ilogger.js';
import type { SocialPost, SocialPostListItem } from '../../../domain/types/socialpost.types.js';
import type { ISocialPostRepository } from '../../ports/repositories/isocialpost.repository.js';
import { createPagination, getPagination } from '../pagination.js';

const EXCERPT_LENGTH = 180;

export interface ListSocialPostsInput {
  page?: string | number;
  pageSize?: string | number;
}

export class ListSocialPostsUseCase {
  constructor(
    private readonly socialPostRepository: ISocialPostRepository,
    private readonly logger?: ILogger
  ) {}

  async execute(input: ListSocialPostsInput = {}) {
    const pagination = getPagination(input);
    this.logger?.info('Social posts list use case started', pagination);
    const result = await this.socialPostRepository.list(pagination);
    this.logger?.info('Social posts list use case completed', {
      recordCount: result.records.length,
      totalRecords: result.totalRecords,
    });

    return {
      records: result.records.map(createSocialPostListItem),
      pagination: createPagination(pagination.page, pagination.pageSize, result.totalRecords),
    };
  }
}

function createSocialPostListItem(post: SocialPost): SocialPostListItem {
  return {
    id: post.id || post.bufferPostId,
    excerpt: createExcerpt(post.text),
    text: post.text,
    coverImageUrl: post.coverImageUrl,
    externalUrl: post.externalUrl,
    publishedAt: post.publishedAt,
    likeCount: post.likeCount || 0,
  };
}

function createExcerpt(text: string): string {
  const value = String(text || '').trim();
  if (value.length <= EXCERPT_LENGTH) return value;

  return `${value.slice(0, EXCERPT_LENGTH - 1).trimEnd()}…`;
}
