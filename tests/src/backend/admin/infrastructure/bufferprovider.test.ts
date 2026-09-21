import assert from 'node:assert/strict';
import test from 'node:test';

import { BufferProvider } from '../../../../../src/backend/admin/infrastructure/buffer/buffer.provider.js';

test('maps LinkedIn reactions, link thumbnails, and skips unsent posts', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(String(options?.body || '{}'));
    const query = String(body.query || '');

    if (query.includes('GetOrganizations')) {
      return jsonResponse({ account: { organizations: [{ id: 'org-1' }] } });
    }

    if (query.includes('GetChannels')) {
      return jsonResponse({ channels: [{ id: 'channel-1', service: 'linkedin' }] });
    }

    return jsonResponse({
      posts: {
        edges: [
          {
            node: {
              id: 'sent-1',
              text: 'Published article https://example.com/post',
              sentAt: '2026-09-01T09:00:00.000Z',
              dueAt: '2026-09-01T09:00:00.000Z',
              metrics: [{ type: 'reactions', value: 4 }],
              metadata: {
                linkAttachment: { thumbnail: 'https://cdn.buffer.com/article.webp' },
              },
              assets: [{ mimeType: 'video/mp4', source: 'https://cdn.buffer.com/clip.mp4' }],
              externalLink: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
            },
          },
          {
            node: {
              id: 'queued-1',
              text: 'Still in the queue https://example.com/queued',
              sentAt: null,
              dueAt: '2026-10-01T09:00:00.000Z',
              metrics: [],
              metadata: { linkAttachment: { thumbnail: 'https://cdn.buffer.com/queued.webp' } },
              assets: [],
              externalLink: null,
            },
          },
          {
            node: {
              id: 'sent-2',
              text: 'Photo post',
              sentAt: '2026-08-01T09:00:00.000Z',
              metrics: [{ type: 'likes', value: 2 }],
              assets: [{ mimeType: 'image/jpeg', source: 'https://cdn.buffer.com/photo.jpg' }],
              externalLink: 'https://www.linkedin.com/feed/update/urn:li:activity:2',
            },
          },
        ],
        pageInfo: { hasNextPage: false, endCursor: null },
      },
    });
  };

  try {
    const posts = await new BufferProvider('buffer-key').listSentLinkedInPosts();

    assert.deepEqual(posts, [
      {
        bufferPostId: 'sent-1',
        text: 'Published article https://example.com/post',
        coverImageUrl: 'https://cdn.buffer.com/article.webp',
        externalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:1',
        publishedAt: '2026-09-01T09:00:00.000Z',
        likeCount: 4,
      },
      {
        bufferPostId: 'sent-2',
        text: 'Photo post',
        coverImageUrl: 'https://cdn.buffer.com/photo.jpg',
        externalUrl: 'https://www.linkedin.com/feed/update/urn:li:activity:2',
        publishedAt: '2026-08-01T09:00:00.000Z',
        likeCount: 2,
      },
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

function jsonResponse(data) {
  return new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
