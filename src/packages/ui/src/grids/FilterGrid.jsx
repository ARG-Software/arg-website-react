import { useRef } from 'react';
import { useFilterReveal } from '../utils/useFilterReveal.js';

export function FilterGrid({
  items,
  activeCategory,
  getItemKey,
  isItemVisible,
  onItemClick,
  renderItem,
  animate = true,
  preset = 'fade-up',
}) {
  const scopeAttrs = animate
    ? {
        'data-animate-scope': true,
        'data-animate-default-preset': preset,
      }
    : {};

  const cardAttrs = i =>
    animate
      ? {
          'data-animate-order': String(i),
        }
      : {};

  const gridRef = useRef(null);
  useFilterReveal(gridRef, '.pc-client-card:not(.is-hidden)', activeCategory, animate);

  return (
    <div className="pc-client-grid" ref={gridRef} {...scopeAttrs}>
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
