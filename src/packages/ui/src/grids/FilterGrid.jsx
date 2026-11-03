import { useEffect, useRef } from 'react';

// Same motion as the site's fade-up preset: 2rem rise, 0.8s ease-out-cubic, 100ms apart, capped at 6 steps
const FILTER_REVEAL = {
  keyframes: [
    { opacity: 0, transform: 'translate3d(0, 2rem, 0)' },
    { opacity: 1, transform: 'translate3d(0, 0, 0)' },
  ],
  duration: 800,
  easing: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  stepMs: 100,
  maxSteps: 6,
};

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
  const previousCategoryRef = useRef(activeCategory);

  // Changing the filter replays the fade-up on the cards that stay visible
  useEffect(() => {
    if (previousCategoryRef.current === activeCategory) return;
    previousCategoryRef.current = activeCategory;
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const cards = gridRef.current.querySelectorAll('.pc-client-card:not(.is-hidden)');
    cards.forEach((card, index) => {
      card.animate(FILTER_REVEAL.keyframes, {
        duration: FILTER_REVEAL.duration,
        easing: FILTER_REVEAL.easing,
        delay: Math.min(index, FILTER_REVEAL.maxSteps) * FILTER_REVEAL.stepMs,
        fill: 'backwards',
      });
    });
  }, [activeCategory, animate]);

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
