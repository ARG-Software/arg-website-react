import { PillButton } from '../pills/Pill.jsx';

export function TagFilterPills({
  tags = [],
  tagCounts = {},
  totalCount = 0,
  selectedTags = [],
  onToggle,
  onClear,
  label,
  allLabel = 'All',
  layout = 'pills',
  className = '',
  animate = false,
  animationPreset = 'fade-up',
  animationOrder,
}) {
  if (!tags.length) return null;

  const isList = layout === 'list';
  const isAllSelected = selectedTags.length === 0;
  const animationAttrs = animate
    ? {
        'data-animate': animationPreset,
        ...(animationOrder !== undefined ? { 'data-animate-order': String(animationOrder) } : {}),
      }
    : {};

  return (
    <div
      className={`tag-filter tag-filter--${isList ? 'list' : 'pills'} ${className}`.trim()}
      role="group"
      aria-label={label || 'Filter by topic'}
      {...animationAttrs}
    >
      {isList && label ? <span className="tag-filter__label">{label}</span> : null}

      {isList ? (
        <div className="tag-filter__list">
          <button
            type="button"
            className={`tag-filter__item${isAllSelected ? ' is-active' : ''}`}
            onClick={() => onClear?.()}
            aria-pressed={isAllSelected}
          >
            <span className="tag-filter__name">{allLabel}</span>
            <span className="tag-filter__count">{totalCount}</span>
          </button>

          {tags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                className={`tag-filter__item${isSelected ? ' is-active' : ''}`}
                onClick={() => onToggle?.(tag)}
                aria-pressed={isSelected}
              >
                <span className="tag-filter__name">{tag}</span>
                <span className="tag-filter__count">{tagCounts[tag] ?? 0}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="tag-filter__pills">
          <PillButton
            className="tag-filter__pill"
            variant="dark"
            size="sm"
            active={isAllSelected}
            onClick={() => onClear?.()}
            aria-pressed={isAllSelected}
          >
            {allLabel} <span className="tag-filter__count">{totalCount}</span>
          </PillButton>

          {tags.map(tag => {
            const isSelected = selectedTags.includes(tag);
            return (
              <PillButton
                key={tag}
                className="tag-filter__pill"
                variant={isSelected ? 'dark' : 'outline'}
                size="sm"
                active={isSelected}
                onClick={() => onToggle?.(tag)}
                aria-pressed={isSelected}
              >
                {tag} <span className="tag-filter__count">{tagCounts[tag] ?? 0}</span>
              </PillButton>
            );
          })}
        </div>
      )}
    </div>
  );
}
