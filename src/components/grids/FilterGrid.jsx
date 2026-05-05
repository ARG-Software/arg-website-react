export function FilterGrid({
  items,
  activeCategory,
  getItemKey,
  isItemVisible,
  onItemClick,
  renderItem,
}) {
  return (
    <div className="pc-client-grid">
      {items.map(item => {
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
          >
            {renderItem(item, visible)}
          </div>
        );
      })}
    </div>
  );
}
