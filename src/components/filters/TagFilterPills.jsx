import { PillButton } from '../pills/Pill';

export function TagFilterPills({
  tags = [],
  tagCounts = {},
  totalCount = 0,
  selectedTags = [],
  onToggle,
  onClear,
  label,
  allLabel = 'All',
  className = '',
  animate = false,
  animationPreset = 'fade-up',
  animationOrder,
}) {
  if (!tags.length) return null;

  const animationAttrs = animate
    ? {
        'data-animate': animationPreset,
        ...(animationOrder !== undefined ? { 'data-animate-order': String(animationOrder) } : {}),
      }
    : {};

  return (
    <div
      className={`tag-filter tag-filter--pills ${className}`.trim()}
      role="group"
      aria-label={label || 'Filter by topic'}
      {...animationAttrs}
    >
      <div className="tag-filter__pills">
        <PillButton
          className="tag-filter__pill"
          variant="dark"
          size="sm"
          active={selectedTags.length === 0}
          onClick={() => onClear?.()}
          aria-pressed={selectedTags.length === 0}
        >
          {allLabel} <span className="tag-filter__count">{totalCount}</span>
        </PillButton>

        {tags.map(tag => {
          const isSelected = selectedTags.includes(tag);
          const count = tagCounts[tag] ?? 0;
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
              {tag} <span className="tag-filter__count">{count}</span>
            </PillButton>
          );
        })}
      </div>
    </div>
  );
}
