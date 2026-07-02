import { useEffect, useState } from 'react';

const DEFAULT_INTERVAL_MS = 6000;

function defaultRenderItem(item, _index, _isActive) {
  return (
    <>
      <h4>{item.title}</h4>
      {item.description && <p>{item.description}</p>}
    </>
  );
}

export function StepProgressTimeline({
  items = [],
  intervalMs = DEFAULT_INTERVAL_MS,
  ariaLabel = 'Timeline',
  className = '',
  renderItem = defaultRenderItem,
  renderLabel = (item, index) => String(index + 1).padStart(2, '0'),
  autoAdvance = true,
  onActiveChange,
  initialIndex = 0,
}) {
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    if (initialIndex < 0 || initialIndex >= items.length) {
      setActiveIndex(0);
    } else {
      setActiveIndex(initialIndex);
    }
  }, [initialIndex, items.length]);

  useEffect(() => {
    if (!autoAdvance || isPaused || items.length < 2) return undefined;

    const id = window.setInterval(() => {
      setActiveIndex(current => {
        const next = (current + 1) % items.length;
        if (onActiveChange) onActiveChange(items[next], next);
        return next;
      });
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [autoAdvance, isPaused, items, intervalMs, onActiveChange]);

  const progress = items.length > 1 ? `${(activeIndex / (items.length - 1)) * 100}%` : '0%';

  const activate = index => {
    setIsPaused(true);
    if (index !== activeIndex) {
      setActiveIndex(index);
      if (onActiveChange) onActiveChange(items[index], index);
    }
  };

  const handleKeyDown = (event, index) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    activate(index);
  };

  if (items.length === 0) return null;

  return (
    <div
      className={`step-progress-timeline ${className}`.trim()}
      style={{ '--step-progress': progress }}
      onMouseLeave={() => setIsPaused(false)}
      aria-label={ariaLabel}
    >
      <span className="step-progress-timeline__rail" aria-hidden="true">
        <span className="step-progress-timeline__fill" />
      </span>
      {items.map((item, index) => (
        <article
          key={item.id ?? item.title ?? index}
          className={`step-progress-timeline__step ${
            activeIndex === index ? 'is-active' : ''
          }`.trim()}
          role="button"
          tabIndex={0}
          aria-current={activeIndex === index ? 'step' : undefined}
          onMouseEnter={() => activate(index)}
          onClick={() => activate(index)}
          onKeyDown={event => handleKeyDown(event, index)}
        >
          <span className="step-progress-timeline__node" aria-hidden="true">
            <span className="step-progress-timeline__ring" />
            <span className="step-progress-timeline__dot">{renderLabel(item, index)}</span>
          </span>
          {renderItem(item, index, activeIndex === index)}
        </article>
      ))}
    </div>
  );
}
