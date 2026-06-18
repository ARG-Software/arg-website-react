import { cubicEaseOut } from '../utils/helpers';

export function animateCountUp(element, end, duration, start = 0) {
  const startTime = performance.now();
  const isDecimal = end % 1 !== 0;

  const step = now => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = cubicEaseOut(progress);
    const current = start + (end - start) * easedProgress;
    if (isDecimal) {
      element.textContent = current.toFixed(1);
    } else {
      element.textContent = Math.round(current).toLocaleString();
    }
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = isDecimal ? end.toFixed(1) : end.toLocaleString();
    }
  };

  requestAnimationFrame(step);
}

export function getCountUpEnd(element) {
  const endAttr = element.getAttribute('data-end') || element.getAttribute('fs-numbercount-end');
  if (endAttr) {
    const end = parseFloat(endAttr);
    if (!isNaN(end)) return end;
  }
  return null;
}
