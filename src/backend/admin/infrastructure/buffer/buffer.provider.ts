import type { ILogger } from '../../../shared/logger/ilogger.js';
import { logOperation } from '../../../shared/logger/logoperation.js';
import { createAdminError } from '../../application/errors.js';
import type {
  BufferSentPost,
  IBufferProvider,
} from '../../application/ports/ibuffer.provider.js';

const BUFFER_API_URL = 'https://api.buffer.com';
const POSTS_PAGE_SIZE = 50;

type GraphQlResponse<T> = {
  data?: T;
  errors?: { message?: string }[];
};

type BufferAsset = {
  thumbnail?: string | null;
  mimeType?: string | null;
  source?: string | null;
  image?: { altText?: string | null } | null;
};

type BufferPostMetric = {
  type?: string | null;
  value?: number | null;
};

type BufferPostNode = {
  id?: string;
  text?: string;
  sentAt?: string | null;
  dueAt?: string | null;
  createdAt?: string | null;
  externalLink?: string | null;
  assets?: BufferAsset[] | null;
  metrics?: BufferPostMetric[] | null;
};

export class BufferProvider implements IBufferProvider {
  constructor(
    private readonly apiKey: string,
    private readonly logger?: ILogger
  ) {}

  async listSentLinkedInPosts(): Promise<BufferSentPost[]> {
    return logOperation(this.logger, 'Buffer sent LinkedIn posts query', {}, async () => {
      if (!this.apiKey) {
        throw createAdminError(
          503,
          'configuration_error',
          'Missing required environment variable: BUFFER_API_KEY'
        );
      }

      const organizationId = await this.getOrganizationId();
      const channelId = await this.getLinkedInChannelId(organizationId);
      const posts: BufferSentPost[] = [];
      let cursor: string | null = null;

      do {
        const page = await this.getSentPostsPage(organizationId, channelId, cursor);
        for (const post of page.posts) {
          const mapped = toSentPost(post);
          if (mapped) posts.push(mapped);
        }
        cursor = page.endCursor;
      } while (cursor);

      return posts;
    }, result => ({ recordCount: result.length }));
  }

  private async getOrganizationId(): Promise<string> {
    const data = await this.query<{ account?: { organizations?: { id?: string }[] } }>(
      `query GetOrganizations {
        account {
          organizations {
            id
          }
        }
      }`
    );
    const organizationId = data.account?.organizations?.[0]?.id;
    if (!organizationId) {
      throw createAdminError(502, 'buffer_request_failed', 'Buffer account has no organization');
    }

    return organizationId;
  }

  private async getLinkedInChannelId(organizationId: string): Promise<string> {
    const data = await this.query<{
      channels?: { id?: string; service?: string }[];
    }>(
      `query GetChannels($organizationId: OrganizationId!) {
        channels(input: { organizationId: $organizationId }) {
          id
          service
        }
      }`,
      { organizationId }
    );
    const channel = (data.channels || []).find(
      item => String(item.service || '').toLowerCase() === 'linkedin'
    );
    if (!channel?.id) {
      throw createAdminError(502, 'buffer_request_failed', 'Buffer account has no LinkedIn channel');
    }

    return channel.id;
  }

  private async getSentPostsPage(
    organizationId: string,
    channelId: string,
    after: string | null
  ): Promise<{ posts: BufferPostNode[]; endCursor: string | null }> {
    const data = await this.query<{
      posts?: {
        edges?: { node?: BufferPostNode }[];
        pageInfo?: { hasNextPage?: boolean; endCursor?: string | null };
      };
    }>(
      `query GetSentPosts(
        $organizationId: OrganizationId!
        $channelIds: [ChannelId!]
        $first: Int
        $after: String
      ) {
        posts(
          first: $first
          after: $after
          input: {
            organizationId: $organizationId
            sort: [{ field: dueAt, direction: desc }, { field: createdAt, direction: desc }]
            filter: { status: [sent], channelIds: $channelIds }
          }
        ) {
          edges {
            node {
              id
              text
              sentAt
              dueAt
              createdAt
              externalLink
              metrics {
                type
                value
              }
              assets {
                thumbnail
                mimeType
                source
                ... on ImageAsset {
                  image {
                    altText
                  }
                }
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }`,
      {
        organizationId,
        channelIds: [channelId],
        first: POSTS_PAGE_SIZE,
        after,
      }
    );
    const pageInfo = data.posts?.pageInfo;

    return {
      posts: (data.posts?.edges || []).map(edge => edge.node || {}),
      endCursor: pageInfo?.hasNextPage ? pageInfo.endCursor || null : null,
    };
  }

  private async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(BUFFER_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(variables ? { query, variables } : { query }),
    });
    const payload = (await response.json().catch(() => ({}))) as GraphQlResponse<T>;

    if (!response.ok || !payload.data) {
      throw createAdminError(
        502,
        'buffer_request_failed',
        payload.errors?.[0]?.message || 'Unable to fetch posts from Buffer'
      );
    }

    if (payload.errors?.length) {
      this.logger?.warn('Buffer GraphQL returned errors', {
        graphQlError: payload.errors[0]?.message,
      });
    }

    return payload.data;
  }
}

function toSentPost(node: BufferPostNode): BufferSentPost | null {
  const text = String(node.text || '').trim();
  const publishedAt = node.sentAt || node.dueAt || node.createdAt || '';
  if (!node.id || !text || !publishedAt) return null;

  return {
    bufferPostId: node.id,
    text,
    coverImageUrl: getCoverImageUrl(node.assets),
    externalUrl: node.externalLink || null,
    publishedAt,
    likeCount: getLikeCount(node.metrics),
  };
}

function getCoverImageUrl(assets: BufferAsset[] | null | undefined): string | null {
  if (!assets?.length) return null;

  const image = assets.find(asset => {
    const mimeType = String(asset.mimeType || '');
    return Boolean(asset.image) || mimeType.startsWith('image/');
  });
  const chosen = image || assets[0];

  return chosen.source || chosen.thumbnail || null;
}

function getLikeCount(metrics: BufferPostMetric[] | null | undefined): number {
  const metric = (metrics || []).find(item => String(item.type || '').toLowerCase() === 'likes');
  const value = Number(metric?.value || 0);

  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
}
