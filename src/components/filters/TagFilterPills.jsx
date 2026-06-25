import { PillButton } from '../pills/Pill';

export function TagFilterPills({
  tags = [],
  selectedTags = [],
  onToggle,
  onRemove,
  label,
  placeholder = 'Select a topic',
  className = '',
  animate = false,
  animationPreset = 'fade-up',
  animationOrder,
}) {
  const selectedTagSet = new Set(selectedTags);
  const availableTags = tags.filter(tag => !selectedTagSet.has(tag));

  if (!tags.length) return null;

  const animationAttrs = animate
    ? {
        'data-animate': animationPreset,
        ...(animationOrder !== undefined ? { 'data-animate-order': String(animationOrder) } : {}),
      }
    : {};

  return (
    <div
      className={`tag-filter ${className}`.trim()}
      aria-label={label || placeholder}
      {...animationAttrs}
    >
      {label && <span className="tag-filter__label">{label}</span>}

      <div className="tag-filter__panel">
        <select
          className="tag-filter__select"
          value=""
          onChange={event => {
            const tag = event.target.value;
            if (tag) onToggle?.(tag);
          }}
          aria-label={label || 'Filter by tag'}
          disabled={availableTags.length === 0}
        >
          <option value="">{availableTags.length ? placeholder : 'All topics selected'}</option>
          {availableTags.map(tag => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>

        {selectedTags.length > 0 && (
          <div className="tag-filter__selected" aria-label="Selected tags">
            {selectedTags.map(tag => (
              <PillButton
                key={tag}
                className="tag-filter__pill tag-filter__pill--selected"
                variant="white"
                size="sm"
                onClick={() => onRemove?.(tag)}
                aria-label={`Remove ${tag} filter`}
                iconAfter={
                  <span className="tag-filter__remove" aria-hidden="true">
                    &times;
                  </span>
                }
              >
                {tag}
              </PillButton>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
