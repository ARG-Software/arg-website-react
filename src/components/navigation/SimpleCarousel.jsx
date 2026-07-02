import { startTransition, useEffect, useRef, useState } from 'react';

const DEFAULT_TRANSITION_DELAY_MS = 360;
const DEFAULT_ARIA_LABEL = 'Carousel';
const DEFAULT_PREV_ARIA_LABEL = 'Show previous items';
const DEFAULT_NEXT_ARIA_LABEL = 'Show next items';

export function SimpleCarousel({
  items = [],
  renderItem,
  getItemKey,
  initialIndex = 0,
  transitionDelayMs = DEFAULT_TRANSITION_DELAY_MS,
  className = '',
  ariaLabel = DEFAULT_ARIA_LABEL,
  prevAriaLabel = DEFAULT_PREV_ARIA_LABEL,
  nextAriaLabel = DEFAULT_NEXT_ARIA_LABEL,
  showIndicator = true,
  onChange,
}) {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, initialIndex));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef(null);

  useEffect(
    () => () => {
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current);
        transitionTimer.current = null;
      }
    },
    []
  );

  if (!items.length || typeof renderItem !== 'function') return null;

  const safeIndex = activeIndex >= items.length ? 0 : activeIndex;
  const activeItem = items[safeIndex];
  const canGoPrevious = safeIndex > 0;
  const canGoNext = safeIndex < items.length - 1;

  const navigate = direction => {
    if (isTransitioning) return;

    const nextIndex = Math.min(items.length - 1, Math.max(0, safeIndex + direction));

    if (nextIndex === safeIndex) return;

    setIsTransitioning(true);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      startTransition(() => {
        setActiveIndex(nextIndex);
        setIsTransitioning(false);

        if (typeof onChange === 'function') {
          onChange({ index: nextIndex, item: items[nextIndex], direction });
        }
      });
    }, transitionDelayMs);
  };

  const wrapperClassName = ['simple-carousel', className].filter(Boolean).join(' ');
  const showControls = items.length > 1;
  const key = typeof getItemKey === 'function' ? getItemKey(activeItem, safeIndex) : safeIndex;

  return (
    <div
      className={wrapperClassName}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div
        className={`simple-carousel__track${isTransitioning ? ' is-transitioning' : ''}`}
        aria-live="polite"
      >
        <div key={key} className="simple-carousel__slide is-active">
          {renderItem(activeItem, safeIndex)}
        </div>
      </div>

      {showControls && (
        <div className="simple-carousel__controls">
          <button
            type="button"
            className="simple-carousel__arrow simple-carousel__arrow--prev"
            aria-label={prevAriaLabel}
            disabled={!canGoPrevious}
            onClick={() => navigate(-1)}
          >
            ←
          </button>
          <button
            type="button"
            className="simple-carousel__arrow simple-carousel__arrow--next"
            aria-label={nextAriaLabel}
            disabled={!canGoNext}
            onClick={() => navigate(1)}
          >
            →
          </button>
        </div>
      )}

      {showControls && showIndicator && (
        <p className="simple-carousel__indicator" aria-hidden="true">
          {safeIndex + 1} of {items.length}
        </p>
      )}
    </div>
  );
}
