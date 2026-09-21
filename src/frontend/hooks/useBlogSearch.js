import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useBlogSearch(
  posts,
  { debounceMs = 200, selectedTags = [], selectedCollections = [] } = {}
) {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q')?.trim() || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), debounceMs);
    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  const filteredPosts = useMemo(() => {
    const selectedTagSet = new Set(selectedTags);
    const selectedCollectionSet = new Set(selectedCollections);
    const q = debouncedQuery.toLowerCase();

    return posts.filter(post => {
      const postTags = (post.tags || [post.tag]).filter(Boolean);
      const matchesTags =
        selectedTagSet.size === 0 || postTags.some(tag => selectedTagSet.has(tag));
      const matchesCollections =
        selectedCollectionSet.size === 0 || selectedCollectionSet.has(post.collectionTitle);
      const matchesQuery =
        !q.trim() ||
        (post.title || '').toLowerCase().includes(q) ||
        postTags.join(' ').toLowerCase().includes(q) ||
        (post.collectionTitle || '').toLowerCase().includes(q) ||
        (post.subtitle || '').toLowerCase().includes(q);

      return matchesTags && matchesCollections && matchesQuery;
    });
  }, [posts, debouncedQuery, selectedTags, selectedCollections]);

  const isSearching = debouncedQuery !== '' && debouncedQuery !== searchQuery;

  return {
    searchQuery,
    setSearchQuery,
    filteredPosts,
    debouncedQuery,
    isSearching,
    resultCount: filteredPosts.length,
  };
}
