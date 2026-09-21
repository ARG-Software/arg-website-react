import { readAdminResponse } from './adminResponse.js';

const ADMIN_SOCIAL_POSTS_ENDPOINT = '/api/admin/social-posts';
const ADMIN_SOCIAL_POSTS_SYNC_ENDPOINT = '/api/admin/social-posts/sync';

export async function fetchAdminSocialPosts(query = {}) {
  const response = await fetch(createSocialPostsUrl(ADMIN_SOCIAL_POSTS_ENDPOINT, query));

  return readAdminResponse(response);
}

export async function syncAdminSocialPosts() {
  const response = await fetch(ADMIN_SOCIAL_POSTS_SYNC_ENDPOINT, { method: 'POST' });

  return readAdminResponse(response);
}

function createSocialPostsUrl(endpoint, query) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search ? `${endpoint}?${search}` : endpoint;
}
