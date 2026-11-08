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

// Changing the filter replays the fade-up on the cards (matched by `selector` inside the
// container) that it shows. The first render is left to the scroll animations
export function useFilterReveal(containerRef, selector, filter, enabled = true) {
  const previousFilterRef = useRef(filter);

  useEffect(() => {
    if (previousFilterRef.current === filter) return;
    previousFilterRef.current = filter;
    if (!enabled || !containerRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    containerRef.current.querySelectorAll(selector).forEach((card, index) => {
      card.animate(FILTER_REVEAL.keyframes, {
        duration: FILTER_REVEAL.duration,
        easing: FILTER_REVEAL.easing,
        delay: Math.min(index, FILTER_REVEAL.maxSteps) * FILTER_REVEAL.stepMs,
        fill: 'backwards',
      });
    });
  }, [containerRef, selector, filter, enabled]);
}
