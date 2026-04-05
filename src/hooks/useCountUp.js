import { useEffect } from 'react';
import { cubicEaseOut } from '../utils/helpers';

export function animateCountUp(element, end, duration, start = 0) {
  const startTime = performance.now();

  const step = now => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = cubicEaseOut(progress);
    const current = Math.round(start + (end - start) * easedProgress);
    element.textContent = current.toLocaleString();
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = end.toLocaleString();
    }
  };

  requestAnimationFrame(step);
}

export function getCountUpEnd(element) {
  const endAttr = element.getAttribute('data-end') || element.getAttribute('fs-numbercount-end');
  if (endAttr) {
    const end = parseInt(endAttr, 10);
    if (!isNaN(end)) return end;
  }
  return null;
}

export function createCountUpObserver(selector, duration = 2000, threshold = 0.5) {
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const element = entry.target;
          const end = getCountUpEnd(element);
          if (end !== null) {
            animateCountUp(element, end, duration);
          }
          observer.unobserve(element);
        }
      });
    },
    { threshold }
  );
  return observer;
}

export function useCountUp(
  selector = '.count-up, .cp-count',
  { duration = 2000, threshold = 0.5 } = {}
) {
  useEffect(() => {
    const observer = createCountUpObserver(selector, duration, threshold);
    document.querySelectorAll(selector).forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [selector, duration, threshold]);
}
