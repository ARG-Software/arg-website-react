export function TagFilterPills({
  tags = [],
  selectedTags = [],
  onToggle,
  onRemove,
  label,
  placeholder = 'Select a topic',
  className = '',
}) {
  const selectedTagSet = new Set(selectedTags);
  const availableTags = tags.filter(tag => !selectedTagSet.has(tag));

  if (!tags.length) return null;

  return (
    <div className={`tag-filter ${className}`.trim()} aria-label={label || placeholder}>
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
              <button
                key={tag}
                type="button"
                className="tag-filter__pill tag-filter__pill--selected"
                onClick={() => onRemove?.(tag)}
                aria-label={`Remove ${tag} filter`}
              >
                <span>{tag}</span>
                <span className="tag-filter__remove" aria-hidden="true">
                  &times;
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
