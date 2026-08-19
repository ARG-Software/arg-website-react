import { useEffect, useRef, useState } from 'react';

const TRANSITION_DELAY_MS = 360;

function TimelineCard({ item }) {
  return (
    <article className="vertical-timeline__card">
      <header className="vertical-timeline__card-head">
        <span className="vertical-timeline__card-period">{item.period}</span>
        <span className="vertical-timeline__card-kicker">{item.kicker}</span>
      </header>
      <h3 className="vertical-timeline__card-headline">{item.headline}</h3>
      {item.summary && <p className="vertical-timeline__summary">{item.summary}</p>}

      <div className="vertical-timeline__card-body">
        <div className="vertical-timeline__main">
          {item.highlights?.length > 0 && (
            <section className="vertical-timeline__section">
              <h4>What happened</h4>
              <ul className="vertical-timeline__highlights">
                {item.highlights.map(highlight => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            </section>
          )}

          {item.whyItMattered && (
            <section className="vertical-timeline__section vertical-timeline__section--impact">
              <h4>Why it mattered</h4>
              <p>{item.whyItMattered}</p>
            </section>
          )}
        </div>

        {item.details?.length > 0 && (
          <div className="vertical-timeline__strands">
            {item.details.map(detail => {
              const toneClass = detail.tone ? ` vertical-timeline__strand--${detail.tone}` : '';
              return (
                <div
                  key={`${item.id ?? item.period}-${detail.label}`}
                  className={`vertical-timeline__strand${toneClass}`}
                >
                  <span className="vertical-timeline__strand-who">{detail.label}</span>
                  <p className="vertical-timeline__strand-text">{detail.text}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
}

function DesktopVerticalTimeline({ items, activeIndex, onSelect }) {
  const activeItem = items[activeIndex];

  const handleKeyDown = (event, index) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    onSelect(index);
  };

  return (
    <div className="vertical-timeline__desktop" data-animate="fade-up">
      <ol className="vertical-timeline__rail">
        {items.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <li key={item.id ?? item.period ?? index}>
              <button
                type="button"
                className={`vertical-timeline__node ${isActive ? 'is-active' : ''}`.trim()}
                onClick={() => onSelect(index)}
                onKeyDown={event => handleKeyDown(event, index)}
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${item.period} ${item.kicker ?? ''}`.trim()}
              >
                <span className="vertical-timeline__period">{item.period}</span>
                <span className="vertical-timeline__kicker">{item.kicker}</span>
              </button>
            </li>
          );
        })}
      </ol>

      <TimelineCard item={activeItem} />
    </div>
  );
}

function MobileVerticalTimeline({ items, ariaLabel, scrollTargetId, onChange }) {
  const [activeIndex, setActiveIndex] = useState(0);
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

  if (items.length === 0) return null;

  const safeIndex = activeIndex >= items.length ? 0 : activeIndex;
  const activeItem = items[safeIndex];
  const canGoPrevious = safeIndex > 0;
  const canGoNext = safeIndex < items.length - 1;
  const showControls = items.length > 1;

  const navigate = direction => {
    if (isTransitioning) return;
    const nextIndex = Math.min(items.length - 1, Math.max(0, safeIndex + direction));
    if (nextIndex === safeIndex) return;

    setIsTransitioning(true);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      setActiveIndex(nextIndex);
      setIsTransitioning(false);
      if (typeof onChange === 'function') {
        onChange({ index: nextIndex, item: items[nextIndex], direction });
      }
    }, TRANSITION_DELAY_MS);
  };

  const trackKey = activeItem.id ?? activeItem.period ?? safeIndex;

  return (
    <div id={scrollTargetId} className="vertical-timeline__mobile" aria-label={ariaLabel}>
      <div
        className={`vertical-timeline__track${isTransitioning ? ' is-transitioning' : ''}`}
        aria-live="polite"
      >
        <div key={trackKey} className="vertical-timeline__slide is-active">
          <TimelineCard item={activeItem} />
        </div>
      </div>

      {showControls && (
        <div className="vertical-timeline__controls">
          <button
            type="button"
            className="vertical-timeline__arrow vertical-timeline__arrow--prev"
            aria-label="Show previous timeline step"
            disabled={!canGoPrevious}
            onClick={() => navigate(-1)}
          >
            ←
          </button>
          <button
            type="button"
            className="vertical-timeline__arrow vertical-timeline__arrow--next"
            aria-label="Show next timeline step"
            disabled={!canGoNext}
            onClick={() => navigate(1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}

export function VerticalTimeline({
  items = [],
  ariaLabel = 'Vertical timeline',
  mobileScrollTargetId,
  onMobileChange,
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (items.length === 0) return null;
  const safeIndex = activeIndex >= items.length ? 0 : activeIndex;

  const handleSelect = index => {
    if (index === safeIndex) return;
    setActiveIndex(index);
  };

  return (
    <div className="vertical-timeline" aria-label={ariaLabel}>
      <DesktopVerticalTimeline items={items} activeIndex={safeIndex} onSelect={handleSelect} />
      <MobileVerticalTimeline
        items={items}
        ariaLabel={ariaLabel}
        scrollTargetId={mobileScrollTargetId}
        onChange={onMobileChange}
      />
    </div>
  );
}
