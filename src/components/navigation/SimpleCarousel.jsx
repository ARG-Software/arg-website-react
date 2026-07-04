import { startTransition, useEffect, useRef, useState } from 'react';

const DEFAULT_TRANSITION_DELAY_MS = 360;
const DEFAULT_ARIA_LABEL = 'Carousel';
const DEFAULT_PREV_ARIA_LABEL = 'Show previous items';
const DEFAULT_NEXT_ARIA_LABEL = 'Show next items';
const MOBILE_MEDIA_QUERY = '(max-width: 767px)';
const TABLET_MEDIA_QUERY = '(max-width: 991px)';

function getBreakpoint(isMobile, isTablet) {
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
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
  onChange,
}) {
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, initialIndex));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [breakpoint, setBreakpoint] = useState('desktop');
  const transitionTimer = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mobileMql = window.matchMedia(MOBILE_MEDIA_QUERY);
    const tabletMql = window.matchMedia(TABLET_MEDIA_QUERY);
    const update = () => {
      setBreakpoint(getBreakpoint(mobileMql.matches, tabletMql.matches && !mobileMql.matches));
    };
    update();
    const handleChange = () => update();
    if (typeof mobileMql.addEventListener === 'function') {
      mobileMql.addEventListener('change', handleChange);
      tabletMql.addEventListener('change', handleChange);
      return () => {
        mobileMql.removeEventListener('change', handleChange);
        tabletMql.removeEventListener('change', handleChange);
      };
    }
    mobileMql.addListener(handleChange);
    tabletMql.addListener(handleChange);
    return () => {
      mobileMql.removeListener(handleChange);
      tabletMql.removeListener(handleChange);
    };
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

  if (!items.length || typeof renderItem !== 'function') return null;

  const perPage = getEffectivePageSize(
    itemsPerPage,
    tabletItemsPerPage,
    mobileItemsPerPage,
    breakpoint
  );
  const safePerPage = Math.max(1, Math.min(items.length, perPage));
  const pageCount = Math.max(1, Math.ceil(items.length / safePerPage));
  const safePageIndex = activeIndex >= pageCount ? 0 : activeIndex;
  const pageStart = safePageIndex * safePerPage;
  const pageItems = items.slice(pageStart, pageStart + safePerPage);
  const canGoPrevious = safePageIndex > 0;
  const canGoNext = safePageIndex < pageCount - 1;

  const navigate = direction => {
    if (isTransitioning) return;

    const nextIndex = Math.min(pageCount - 1, Math.max(0, safePageIndex + direction));

    if (nextIndex === safePageIndex) return;

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

  const wrapperClassName = ['simple-carousel', className].filter(Boolean).join(' ');
  const showControls = pageCount > 1;
  const trackKey = pageItems.map((item, i) =>
    typeof getItemKey === 'function' ? getItemKey(item, pageStart + i) : pageStart + i
  );

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
