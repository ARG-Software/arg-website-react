export function parseBlogDate(date) {
  const timestamp = Date.parse(date || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function sortBlogPostsNewestFirst(articleA, articleB) {
  const dateDiff = parseBlogDate(articleB.date) - parseBlogDate(articleA.date);
  if (dateDiff) return dateDiff;
  return (articleA.title || articleA.slug || '').localeCompare(
    articleB.title || articleB.slug || ''
  );
}
