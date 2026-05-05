import { useEffect, useRef, useCallback } from 'react';

export function Marquee({
  items,
  renderItem,
  getItemKey,
  repetitions = 4,
  speed = 80,
  outerClassName = '',
  trackClassName = '',
  setClassName = '',
  revealOnScroll = false,
  className = '',
  children,
}) {
  const outerRef = useRef(null);
  const trackRef = useRef(null);
  const rafRef = useRef(null);
  const positionRef = useRef(0);
  const lastTimeRef = useRef(null);
  const speedMultiplierRef = useRef(1);
  const observerRef = useRef(null);

  const animate = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const halfWidth = track.scrollWidth / 2;

    const tick = timestamp => {
      if (lastTimeRef.current === null) lastTimeRef.current = timestamp;
      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      positionRef.current += delta * (speed / 1000) * speedMultiplierRef.current;
      if (positionRef.current >= halfWidth) {
        positionRef.current -= halfWidth;
      }

      track.style.transform = `translateX(${-positionRef.current}px)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [speed]);

  const handleMouseEnter = useCallback(() => {
    speedMultiplierRef.current = 0.2;
  }, []);

  const handleMouseLeave = useCallback(() => {
    speedMultiplierRef.current = 1;
  }, []);

  useEffect(() => {
    if (revealOnScroll && outerRef.current) {
      const el = outerRef.current;
      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.classList.add('is-revealed');
            observerRef.current?.disconnect();
          }
        },
        { threshold: 0.1 },
      );
      observerRef.current.observe(el);

      return () => observerRef.current?.disconnect();
    }
  }, [revealOnScroll]);

  useEffect(() => {
    const cleanupAnim = animate();

    const el = outerRef.current || trackRef.current;
    if (el) {
      el.addEventListener('mouseenter', handleMouseEnter);
      el.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (cleanupAnim) cleanupAnim();
      if (el) {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [animate, handleMouseEnter, handleMouseLeave]);

  const hasItems = items && renderItem;

  const renderContent = () => {
    if (hasItems && !children) {
      return [...Array(repetitions)].map((_, setIdx) => (
        <div key={setIdx} className={setClassName}>
          {items.map((item, itemIdx) => {
            const key = getItemKey ? getItemKey(item, itemIdx) : itemIdx;
            return <span key={key}>{renderItem(item, itemIdx)}</span>;
          })}
        </div>
      ));
    }

    return [...Array(repetitions)].map((_, setIdx) => (
      <div key={setIdx} className={setClassName}>
        {children}
      </div>
    ));
  };

  const trackElement = (
    <div className={trackClassName} ref={trackRef}>
      {renderContent()}
    </div>
  );

  if (outerClassName) {
    return (
      <div className={`${outerClassName} ${className}`.trim()} ref={outerRef}>
        {trackElement}
      </div>
    );
  }

  return trackElement;
}
