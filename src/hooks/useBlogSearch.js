import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';

export function useBlogSearch(posts, { debounceMs = 200, selectedTags = [] } = {}) {
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
    const q = debouncedQuery.toLowerCase();

    return posts.filter(
      post =>
        (selectedTagSet.size === 0 || selectedTagSet.has(post.tag)) &&
        (!q.trim() ||
          post.title.toLowerCase().includes(q) ||
          post.tag.toLowerCase().includes(q) ||
          post.subtitle.toLowerCase().includes(q))
    );
  }, [posts, debouncedQuery, selectedTags]);

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
