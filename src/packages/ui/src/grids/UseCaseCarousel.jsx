import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { Draggable } from 'gsap/Draggable';
import { arrowSvg } from '../icons/SocialIcons.jsx';

gsap.registerPlugin(Draggable);

const WHEEL_THRESHOLD = 60;
const WHEEL_COOLDOWN_MS = 420;

function clampIndex(index, length) {
  return Math.min(length - 1, Math.max(0, index));
}

/**
 * Full-bleed picker: the selected item fills the background, a strip of thumbnails sits across
 * the middle. Selecting only changes the slide; `onOpen` is the explicit "go there" action.
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
  const stripRef = useRef(null);
  const draggableRef = useRef(null);
  const backgroundRefs = useRef([]);
  const [index, setIndex] = useState(() => clampIndex(defaultIndex, items.length));
  const [visited, setVisited] = useState(() => new Set([clampIndex(defaultIndex, items.length)]));
  const indexRef = useRef(index);
  indexRef.current = index;

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

  // The strip is translated so the selected thumbnail sits in the middle of the section
  const getStripX = useCallback(targetIndex => {
    const root = rootRef.current;
    const strip = stripRef.current;
    const thumb = strip?.firstElementChild;
    if (!root || !thumb) return 0;

    const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
    const step = thumb.offsetWidth + gap;
    return root.clientWidth / 2 - (targetIndex * step + thumb.offsetWidth / 2);
  }, []);

  const getNearestIndex = useCallback(
    x => {
      const strip = stripRef.current;
      const thumb = strip?.firstElementChild;
      if (!thumb) return indexRef.current;

      const gap = parseFloat(getComputedStyle(strip).columnGap) || 0;
      const step = thumb.offsetWidth + gap;
      return clampIndex(
        Math.round((rootRef.current.clientWidth / 2 - x - thumb.offsetWidth / 2) / step),
        items.length
      );
    },
    [items.length]
  );

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip || items.length === 0) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const [draggable] = Draggable.create(strip, {
      type: 'x',
      edgeResistance: 0.85,
      zIndexBoost: false,
      minimumMovement: 6,
      onDragEnd() {
        const target = getNearestIndex(this.x);
        if (target === indexRef.current) {
          gsap.to(strip, {
            x: getStripX(target),
            duration: reducedMotion ? 0 : 0.5,
            ease: 'power3.out',
          });
        } else {
          select(target, 'drag');
        }
      },
    });
    draggableRef.current = draggable;

    const applyLayout = () => {
      draggable.applyBounds({ minX: getStripX(items.length - 1), maxX: getStripX(0) });
      gsap.set(strip, { x: getStripX(indexRef.current) });
      draggable.update();
    };

    applyLayout();
    const observer = new ResizeObserver(applyLayout);
    observer.observe(rootRef.current);

    return () => {
      observer.disconnect();
      draggable.kill();
      draggableRef.current = null;
    };
  }, [getNearestIndex, getStripX, items.length, select]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tween = gsap.to(strip, {
      x: getStripX(index),
      duration: reducedMotion ? 0 : 0.6,
      ease: 'power3.out',
      onComplete: () => draggableRef.current?.update(),
    });
    return () => tween.kill();
  }, [getStripX, index]);

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
  const count = String(items.length).padStart(2, '0');

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
          {visited.has(i) && (
            <img
              ref={element => {
                backgroundRefs.current[i] = element;
              }}
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
      <div className="ucc-tint" aria-hidden="true" />
      <div className="ucc-shade" aria-hidden="true" />
      <div className="ucc-grain" aria-hidden="true" />

      <div className="ucc-head padding-global">
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

      <div className="ucc-strip-wrap">
        <div ref={stripRef} className="ucc-strip">
          {items.map((item, i) => (
            <button
              key={item.key}
              type="button"
              className={`ucc-thumb${i === index ? ' is-active' : ''}`}
              aria-label={item.title.replace(/\n/g, ' ')}
              aria-current={i === index}
              onClick={() => {
                if (i === indexRef.current) {
                  onOpen?.(i, backgroundRefs.current[i]);
                } else {
                  select(i, 'click');
                }
              }}
            >
              <img
                src={item.thumb}
                srcSet={item.thumbSrcSet}
                sizes="(max-width: 767px) 10rem, 18rem"
                alt=""
                loading="lazy"
                decoding="async"
                draggable="false"
              />
            </button>
          ))}
        </div>
        <button
          type="button"
          className="prp-live-link ucc-cta"
          onClick={() => onOpen?.(index, backgroundRefs.current[index])}
        >
          <span>{ctaText}</span>
          <span className="arrow_icon-embed" aria-hidden="true">
            {arrowSvg}
          </span>
        </button>
      </div>

      <div className="ucc-foot padding-global">
        <div className="ucc-progress">
          <div className="ucc-count">
            <span>{String(index + 1).padStart(2, '0')}</span>
            <span>{count}</span>
          </div>
          <div className="ucc-track">
            <div
              className="ucc-track-fill"
              style={{ width: `${100 / items.length}%`, left: `${(index / items.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <p className="ucc-live" aria-live="polite">
        {`${active.title.replace(/\n/g, ' ')}, ${index + 1} of ${items.length}`}
      </p>
    </div>
  );
}
