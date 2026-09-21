const SOCIAL_POSTS_ENDPOINT = '/api/social-posts';

export async function fetchSocialPosts({ page = 1, pageSize = 3 } = {}) {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const response = await fetch(`${SOCIAL_POSTS_ENDPOINT}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Social posts request failed: ${response.status}`);
  }

  return response.json();
}
