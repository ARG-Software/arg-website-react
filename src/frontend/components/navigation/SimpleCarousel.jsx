import { startTransition, useEffect, useRef, useState } from 'react';
import { useSwipe } from '@ui/utils/useSwipe.js';
import { isMobile, isTablet } from '@utils/helpers';

const DEFAULT_TRANSITION_DELAY_MS = 360;
const DEFAULT_ARIA_LABEL = 'Carousel';
const DEFAULT_PREV_ARIA_LABEL = 'Show previous items';
const DEFAULT_NEXT_ARIA_LABEL = 'Show next items';

function getBreakpoint() {
  if (isMobile()) return 'mobile';
  if (isTablet()) return 'tablet';
  return 'desktop';
}

function getEffectivePageSize(itemsPerPage, tabletItemsPerPage, mobileItemsPerPage, breakpoint) {
  const desktop = Math.max(1, Math.floor(itemsPerPage) || 1);
  if (breakpoint === 'mobile') {
    return mobileItemsPerPage == null ? desktop : Math.max(1, Math.floor(mobileItemsPerPage) || 1);
  }
  if (breakpoint === 'tablet') {
    return tabletItemsPerPage == null ? desktop : Math.max(1, Math.floor(tabletItemsPerPage) || 1);
  }
  return desktop;
}

export function SimpleCarousel({
  items = [],
  renderItem,
  getItemKey,
  initialIndex = 0,
  transitionDelayMs = DEFAULT_TRANSITION_DELAY_MS,
  itemsPerPage = 1,
  tabletItemsPerPage,
  mobileItemsPerPage,
  className = '',
  ariaLabel = DEFAULT_ARIA_LABEL,
  prevAriaLabel = DEFAULT_PREV_ARIA_LABEL,
  nextAriaLabel = DEFAULT_NEXT_ARIA_LABEL,
  showIndicator = true,
  hasMore = false,
  onNeedMore,
  onChange,
}) {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, initialIndex));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [breakpoint, setBreakpoint] = useState('desktop');
  const transitionTimer = useRef(null);
  const swipeRef = useRef(null);

  useEffect(() => {
    const update = () => setBreakpoint(getBreakpoint());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(
    () => () => {
      if (transitionTimer.current) {
        clearTimeout(transitionTimer.current);
        transitionTimer.current = null;
      }
    },
    []
  );

  const perPage = getEffectivePageSize(
    itemsPerPage,
    tabletItemsPerPage,
    mobileItemsPerPage,
    breakpoint
  );
  const safePerPage = Math.max(1, Math.min(Math.max(items.length, 1), perPage));
  const pageCount = Math.max(1, Math.ceil(Math.max(items.length, 1) / safePerPage));
  const safePageIndex = activeIndex >= pageCount ? 0 : activeIndex;

  const navigate = direction => {
    if (isTransitioning) return;

    const nextIndex = Math.min(pageCount - 1, Math.max(0, safePageIndex + direction));

    if (nextIndex === safePageIndex) {
      if (direction > 0 && hasMore && typeof onNeedMore === 'function') {
        setIsTransitioning(true);
        Promise.resolve(onNeedMore())
          .then(loaded => {
            startTransition(() => {
              if (loaded) setActiveIndex(current => current + 1);
              setIsTransitioning(false);
            });
          })
          .catch(() => {
            setIsTransitioning(false);
          });
      }
      return;
    }

    setIsTransitioning(true);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      startTransition(() => {
        setActiveIndex(nextIndex);
        setIsTransitioning(false);

        if (typeof onChange === 'function') {
          onChange({ index: nextIndex, item: items[nextIndex * safePerPage], direction });
        }
      });
    }, transitionDelayMs);
  };

  useSwipe(swipeRef, navigate, {
    canMove: delta => {
      if (isTransitioning) return false;
      const next = safePageIndex + delta;
      if (next >= 0 && next < pageCount) return true;
      return delta > 0 && hasMore;
    },
  });

  if (!items.length || typeof renderItem !== 'function') return null;

  const pageStart = safePageIndex * safePerPage;
  const pageItems = items.slice(pageStart, pageStart + safePerPage);
  const canGoPrevious = safePageIndex > 0;
  const canGoNext = safePageIndex < pageCount - 1 || hasMore;

  const wrapperClassName = ['simple-carousel', className].filter(Boolean).join(' ');
  const showControls = pageCount > 1 || hasMore;
  const trackKey = pageItems.map((item, i) =>
    typeof getItemKey === 'function' ? getItemKey(item, pageStart + i) : pageStart + i
  );

  return (
    <div
      ref={swipeRef}
      className={wrapperClassName}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
    >
      <div
        className={`simple-carousel__track${isTransitioning ? ' is-transitioning' : ''}`}
        aria-live="polite"
      >
        <div key={trackKey.join('|')} className="simple-carousel__slide is-active">
          {pageItems.map((item, i) => (
            <div key={trackKey[i]} className="simple-carousel__page-item">
              {renderItem(item, pageStart + i)}
            </div>
          ))}
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
          {safePageIndex + 1} of {pageCount}
        </p>
      )}
    </div>
  );
}
