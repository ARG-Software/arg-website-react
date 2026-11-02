import { Fragment, useEffect, useRef, useState } from 'react';

const searchSvg = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.25"
    strokeLinecap="round"
  >
    <circle cx="11" cy="11" r="7.5" />
    <path d="m20.5 20.5-4-4" />
  </svg>
);

const chevronSvg = (
  <svg
    viewBox="0 0 12 12"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m4.5 2.5 3.5 3.5-3.5 3.5" />
  </svg>
);

/**
 * Floating blog filter panel: search, topics and collections. `active` is the one selected
 * item across both lists: { type: 'all' }, { type: 'topic', value } or { type: 'collection', value }.
 */
export function BlogSidebar({
  searchQuery,
  onSearchChange,
  topics,
  totalCount,
  collections,
  active,
  onSelect,
}) {
  const searchRef = useRef(null);
  const [isApple] = useState(() =>
    /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  );

  useEffect(() => {
    const onKeyDown = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const isActive = (type, value) => active.type === type && active.value === value;

  return (
    <div className="blp-panel">
      <label className="blp-search">
        <span className="blp-search-icon" aria-hidden="true">
          {searchSvg}
        </span>
        <input
          ref={searchRef}
          type="search"
          className="blp-search-input"
          placeholder="Search articles"
          value={searchQuery}
          onChange={event => onSearchChange(event.target.value)}
          aria-label="Search articles"
        />
        <kbd className="blp-search-hint" aria-hidden="true">
          {isApple ? '⌘K' : 'Ctrl K'}
        </kbd>
      </label>

      {/* Phones get one native select instead of the long lists */}
      <label className="blp-filter-select">
        <span className="blp-filter-select-label">Filter</span>
        <select
          value={active.type === 'all' ? 'all' : `${active.type}:${active.value}`}
          onChange={event => {
            const [type, ...rest] = event.target.value.split(':');
            onSelect(type === 'all' ? { type: 'all' } : { type, value: rest.join(':') });
          }}
        >
          <option value="all">All articles ({totalCount})</option>
          <optgroup label="Topics">
            {topics.map(topic => (
              <option key={topic.name} value={`topic:${topic.name}`}>
                {topic.name} ({topic.count})
              </option>
            ))}
          </optgroup>
          {collections.length > 0 && (
            <optgroup label="Collections">
              {collections.map(collection => (
                <option key={collection.title} value={`collection:${collection.title}`}>
                  {collection.title} ({collection.count})
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <span className="blp-filter-select-chevron" aria-hidden="true">
          {chevronSvg}
        </span>
      </label>

      <div className="blp-panel-label">
        <span>Topics</span>
        <span>{topics.length}</span>
      </div>
      <ul className="blp-topics">
        {[{ name: 'All', count: totalCount }, ...topics].map(topic => {
          const selected =
            topic.name === 'All' ? active.type === 'all' : isActive('topic', topic.name);
          return (
            <Fragment key={topic.name}>
              <li>
                <button
                  type="button"
                  className={`blp-topic${selected ? ' is-active' : ''}`}
                  aria-pressed={selected}
                  onClick={() =>
                    onSelect(
                      topic.name === 'All' ? { type: 'all' } : { type: 'topic', value: topic.name }
                    )
                  }
                >
                  <span className="blp-topic-name">{topic.name}</span>
                  <span className="blp-topic-count">{topic.count}</span>
                </button>
              </li>
              {topic.name === 'All' && <li className="blp-topics-rule" aria-hidden="true" />}
            </Fragment>
          );
        })}
      </ul>

      {collections.length > 0 && (
        <>
          <hr className="blp-panel-rule" />
          <div className="blp-panel-label">
            <span>Collections</span>
            <span>{collections.length}</span>
          </div>
          <ul className="blp-collections">
            {collections.map(collection => {
              const selected = isActive('collection', collection.title);
              return (
                <li key={collection.title}>
                  <button
                    type="button"
                    className={`blp-collection${selected ? ' is-active' : ''}`}
                    aria-pressed={selected}
                    title={collection.title}
                    onClick={() => onSelect({ type: 'collection', value: collection.title })}
                  >
                    <span className="blp-collection-tile">{collection.count}</span>
                    <span className="blp-collection-body">
                      <span className="blp-collection-name">{collection.title}</span>
                      <span className="blp-collection-meta">
                        {collection.count} articles · {collection.minutes} min
                      </span>
                    </span>
                    <span className="blp-collection-chevron" aria-hidden="true">
                      {chevronSvg}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
