import { useState, useEffect, useMemo } from 'react';

export function useBlogSearch(posts, { debounceMs = 200 } = {}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), debounceMs);
    return () => clearTimeout(timer);
  }, [searchQuery, debounceMs]);

  const filteredPosts = useMemo(() => {
    if (!debouncedQuery.trim()) return posts;
    const q = debouncedQuery.toLowerCase();
    return posts.filter(
      post =>
        post.title.toLowerCase().includes(q) ||
        post.tag.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q)
    );
  }, [posts, debouncedQuery]);

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
