import { sortBlogPostsNewestFirst } from './articleSorting.js';

export function parseBlogDate(date) {
  const timestamp = Date.parse(date || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function parseDateToIso(date) {
  const timestamp = parseBlogDate(date);
  return timestamp ? new Date(timestamp).toISOString() : '';
}

export function getBlogTags(posts) {
  return Array.from(
    new Set(posts.flatMap(article => article.tags || [article.tag]).filter(Boolean))
  ).sort();
}

export function getRelatedPosts(posts, sourcePost, limit = 3) {
  const seenSlugs = new Set([sourcePost.slug]);
  const addUniquePosts = candidates =>
    candidates.filter(post => {
      if (seenSlugs.has(post.slug)) return false;
      seenSlugs.add(post.slug);
      return true;
    });

  const collectionRelated = sourcePost.collection
    ? addUniquePosts(
        posts.filter(post => post.collection === sourcePost.collection).sort(sortByCollectionPart)
      )
    : [];

  const sourceTags = new Set((sourcePost.tags || [sourcePost.tag]).filter(Boolean));
  const tagRelated = addUniquePosts(
    posts.filter(post => (post.tags || [post.tag]).filter(Boolean).some(tag => sourceTags.has(tag)))
  );
  const fallback = addUniquePosts(posts);

  return [...collectionRelated, ...tagRelated, ...fallback].slice(0, limit);
}

function sortByCollectionPart(postA, postB) {
  const partA = Number.parseInt(postA.collectionPart, 10);
  const partB = Number.parseInt(postB.collectionPart, 10);
  if (Number.isFinite(partA) && Number.isFinite(partB) && partA !== partB) {
    return partA - partB;
  }
  return sortBlogPostsNewestFirst(postA, postB);
}

export function getHeadingId(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function findNearestWordBoundary(text, targetIndex) {
  const beforeTarget = text.lastIndexOf(' ', targetIndex);
  const afterTarget = text.indexOf(' ', targetIndex);
  if (beforeTarget === -1) return afterTarget === -1 ? text.length : afterTarget;
  if (afterTarget === -1) return beforeTarget;
  return targetIndex - beforeTarget <= afterTarget - targetIndex ? beforeTarget : afterTarget;
}

export function splitArticleTitle(title) {
  const normalizedTitle = title.trim();
  if (!normalizedTitle) return [''];

  const minIndex = normalizedTitle.length * 0.35;
  const maxIndex = normalizedTitle.length * 0.72;
  const targetIndex = normalizedTitle.length * 0.52;
  const candidates = [];

  for (let index = 0; index < normalizedTitle.length; index += 1) {
    const character = normalizedTitle[index];
    const nextCharacter = normalizedTitle[index + 1];
    if ('.:?!'.includes(character) && nextCharacter === ' ') {
      candidates.push(index + 1);
    }
  }

  [' - ', ' — ', ' – '].forEach(separator => {
    const index = normalizedTitle.indexOf(separator);
    if (index !== -1) candidates.push(index);
  });

  const bestPunctuationSplit = candidates
    .filter(index => index >= minIndex && index <= maxIndex)
    .sort((indexA, indexB) => Math.abs(indexA - targetIndex) - Math.abs(indexB - targetIndex))[0];

  const splitIndex = bestPunctuationSplit ?? findNearestWordBoundary(normalizedTitle, targetIndex);
  const firstLine = normalizedTitle.slice(0, splitIndex).trim();
  const secondLine = normalizedTitle
    .slice(splitIndex)
    .replace(/^[-—–]\s*/, '')
    .trim();

  return secondLine ? [firstLine, secondLine] : [normalizedTitle];
}

export { sortBlogPostsNewestFirst };
