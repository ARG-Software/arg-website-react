export function FilterGrid({
  items,
  activeCategory,
  getItemKey,
  isItemVisible,
  onItemClick,
  renderItem,
  animate = true,
  preset = 'fade-up',
  stagger = 100,
}) {
  const scopeAttrs = animate
    ? {
        'data-animate-scope': true,
        'data-animate-default-preset': preset,
        'data-animate-default-stagger': String(stagger),
      }
    : {};

  const cardAttrs = i =>
    animate
      ? {
          'data-animate-order': String(i),
        }
      : {};

  return (
    <div className="pc-client-grid" {...scopeAttrs}>
      {items.map((item, i) => {
        const key = getItemKey(item);
        const visible = isItemVisible(item, activeCategory);
        return (
          <div
            key={key}
            className={`pc-client-card${visible ? '' : ' is-hidden'}`}
            onClick={() => visible && onItemClick(item)}
            role={visible ? 'button' : undefined}
            tabIndex={visible ? 0 : -1}
            onKeyDown={e => {
              if (visible && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onItemClick(item);
              }
            }}
            {...cardAttrs(i)}
          >
            {renderItem(item, visible)}
          </div>
        );
      })}
    </div>
  );
}
