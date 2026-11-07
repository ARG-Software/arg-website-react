import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { arrowSvg } from '../icons/SocialIcons.jsx';

const WHEEL_THRESHOLD = 60;
const WHEEL_COOLDOWN_MS = 420;
const SWIPE_THRESHOLD = 40;
// Matches `.ucc-thumb.is-active` scale: half of the extra width it gains
const ACTIVE_GROWTH = 0.15;

function clampIndex(index, length) {
  return Math.min(length - 1, Math.max(0, index));
}

/**
 * Project picker: the selected item's image fades in behind the section, its title sits above a
 * fixed row of thumbnails between the page margins. The row only shifts when the selection moves past its first or
 * last visible thumbnail. Hovering (or tapping on touch screens) selects; clicking the selected
 * thumbnail or the CTA calls `onOpen`, the "go there" action.
 */
export function UseCaseCarousel({
  items = [],
  defaultIndex = 0,
  eyebrow,
  ctaText = 'Open',
  ariaLabel = 'Carousel',
  onSelect,
  onOpen,
}) {
  const rootRef = useRef(null);
  const viewportRef = useRef(null);
  const stripRef = useRef(null);
  const thumbRefs = useRef([]);
  const swipeStartRef = useRef(null);
  const swipedRef = useRef(false);
  const positionedRef = useRef(false);
  const [index, setIndex] = useState(() => clampIndex(defaultIndex, items.length));
  // Background images load only once their item has been selected
  const [visited, setVisited] = useState(() => new Set([clampIndex(defaultIndex, items.length)]));
  const [layout, setLayout] = useState({ visible: items.length, thumbWidth: 0, gap: 0 });
  const [windowStart, setWindowStart] = useState(0);
  const indexRef = useRef(index);
  useLayoutEffect(() => {
    indexRef.current = index;
  }, [index]);

  const select = useCallback(
    (nextIndex, method) => {
      const target = clampIndex(nextIndex, items.length);
      if (target === indexRef.current) return;

      setIndex(target);
      setVisited(previous => (previous.has(target) ? previous : new Set(previous).add(target)));
      onSelect?.(target, method);
    },
    [items.length, onSelect]
  );

  // As many thumbnails as fit at their base size, stretched to fill the margins exactly
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const strip = stripRef.current;
    if (!viewport || !strip) return undefined;

    // The browser reports pixels; the layout is kept in rem, like the rest of the CSS
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      const viewportWidth = viewport.clientWidth / rem;
      const gap = (parseFloat(getComputedStyle(strip).columnGap) || 0) / rem;
      // The viewport is one thumbnail tall; thumbnails start at 3:2, like the images
      const baseWidth = (viewport.clientHeight / rem) * 1.5;
      if (!baseWidth) return;

      const visible = Math.min(
        items.length,
        Math.max(1, Math.floor((viewportWidth + gap) / (baseWidth + gap)))
      );
      const thumbWidth = (viewportWidth - gap * (visible - 1)) / visible;
      setLayout({ visible, thumbWidth, gap });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [items.length]);

  // The visible window only moves when the selection steps past its first or last thumbnail
  let start = Math.min(windowStart, Math.max(0, items.length - layout.visible));
  if (index < start) start = index;
  if (index > start + layout.visible - 1) start = index - layout.visible + 1;
  if (start !== windowStart) setWindowStart(start);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || !layout.thumbWidth) return undefined;

    const x = `${-start * (layout.thumbWidth + layout.gap)}rem`;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!positionedRef.current || reducedMotion) {
      positionedRef.current = true;
      gsap.set(strip, { x });
      return undefined;
    }

    const tween = gsap.to(strip, { x, duration: 0.6, ease: 'power3.out' });
    return () => tween.kill();
  }, [layout, start]);

  // Horizontal trackpad swipes step through the slides; vertical wheel stays with page scrolling
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let accumulated = 0;
    let lockedUntil = 0;

    const onWheel = event => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      if (event.timeStamp < lockedUntil) return;

      accumulated += event.deltaX;
      if (Math.abs(accumulated) < WHEEL_THRESHOLD) return;

      select(indexRef.current + Math.sign(accumulated), 'wheel');
      accumulated = 0;
      lockedUntil = event.timeStamp + WHEEL_COOLDOWN_MS;
    };

    root.addEventListener('wheel', onWheel, { passive: false });
    return () => root.removeEventListener('wheel', onWheel);
  }, [select]);

  const handleKeyDown = event => {
    const targets = {
      ArrowLeft: index - 1,
      ArrowRight: index + 1,
      Home: 0,
      End: items.length - 1,
    };
    if (!(event.key in targets)) return;

    event.preventDefault();
    select(targets[event.key], 'key');
  };

  const active = items[index];
  if (!active) return null;

  const titleLines = active.title.split('\n');
  const end = start + layout.visible - 1;

  // The selected thumbnail grows away from the margin it touches, so it never crosses it
  let edge = 'center';
  if (index === start && index !== end) edge = 'start';
  if (index === end && index !== start) edge = 'end';

  const step = layout.thumbWidth + layout.gap;
  let ctaLeft = (index - start) * step + layout.thumbWidth / 2;
  if (edge === 'start') ctaLeft += layout.thumbWidth * ACTIVE_GROWTH;
  if (edge === 'end') ctaLeft -= layout.thumbWidth * ACTIVE_GROWTH;

  return (
    <div
      ref={rootRef}
      className="ucc"
      role="group"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, i) => (
        <div
          key={item.key}
          className={`ucc-bg${i === index ? ' is-active' : ''}`}
          aria-hidden="true"
        >
          {visited.has(i) && item.image && (
            <img
              className="ucc-bg-img"
              src={item.image}
              srcSet={item.srcSet}
              sizes="100vw"
              alt=""
              draggable="false"
            />
          )}
        </div>
      ))}
      <div className="ucc-wash" aria-hidden="true" />

      <div className="ucc-inner container padding-global">
        <div className="ucc-head">
          {eyebrow && <p className="ucc-eyebrow">{eyebrow}</p>}
          <div className="ucc-head-row">
            <h2 key={`title-${active.key}`} className="ucc-title">
              {titleLines.map((line, i) => (
                <span key={line} className="ucc-title-mask">
                  <span className="ucc-title-line" style={{ '--ucc-line': i }}>
                    {line}
                  </span>
                </span>
              ))}
            </h2>
            {active.credit && (
              <p key={`credit-${active.key}`} className="ucc-credit">
                {active.credit}
              </p>
            )}
            {active.meta?.length > 0 && (
              <ul key={`meta-${active.key}`} className="ucc-meta">
                {active.meta.map((entry, i) => (
                  <li key={entry} style={{ '--ucc-meta': i }}>
                    {entry}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div
          ref={viewportRef}
          className="ucc-strip-viewport"
          onPointerDown={event => {
            swipeStartRef.current = event.clientX;
            swipedRef.current = false;
          }}
          onPointerUp={event => {
            if (swipeStartRef.current === null) return;
            const delta = event.clientX - swipeStartRef.current;
            swipeStartRef.current = null;
            if (Math.abs(delta) < SWIPE_THRESHOLD) return;

            swipedRef.current = true;
            select(indexRef.current + (delta < 0 ? 1 : -1), 'swipe');
          }}
        >
          <div
            ref={stripRef}
            className="ucc-strip"
            style={{ '--ucc-thumb-w': layout.thumbWidth ? `${layout.thumbWidth}rem` : undefined }}
          >
            {items.map((item, i) => {
              const outside = i < start || i > end;
              const classes = ['ucc-thumb'];
              if (i === index) classes.push('is-active', `is-edge-${edge}`);
              if (outside) classes.push('is-outside');

              return (
                <button
                  key={item.key}
                  type="button"
                  className={classes.join(' ')}
                  aria-label={item.title.replace(/\n/g, ' ')}
                  aria-current={i === index}
                  tabIndex={outside ? -1 : undefined}
                  onPointerEnter={event => {
                    // Mouse hover selects; touch and pen select on tap, and a held button is a drag
                    if (event.pointerType === 'mouse' && event.buttons === 0) select(i, 'hover');
                  }}
                  onClick={() => {
                    // A swipe ends with a click on whichever thumbnail it started on
                    if (swipedRef.current) {
                      swipedRef.current = false;
                      return;
                    }
                    if (i === indexRef.current) {
                      onOpen?.(i, thumbRefs.current[i]);
                    } else {
                      select(i, 'click');
                    }
                  }}
                >
                  <img
                    ref={element => {
                      thumbRefs.current[i] = element;
                    }}
                    src={item.thumb}
                    srcSet={item.thumbSrcSet}
                    sizes="(max-width: 47.9375rem) 14rem, 18rem"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                  />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="prp-live-link ucc-cta"
            style={{ left: `${ctaLeft}rem` }}
            aria-label={`${ctaText} ${items[index]?.title.replace(/\n/g, ' ')}`}
            onClick={() => onOpen?.(index, thumbRefs.current[index])}
          >
            <span>{ctaText}</span>
            <span className="arrow_icon-embed" aria-hidden="true">
              {arrowSvg}
            </span>
          </button>
        </div>
      </div>

      <p className="ucc-live" aria-live="polite">
        {`${active.title.replace(/\n/g, ' ')}, ${index + 1} of ${items.length}`}
      </p>
    </div>
  );
}
