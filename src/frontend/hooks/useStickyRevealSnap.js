import { useEffect } from 'react';
import { prefersReducedMotion } from '@utils/helpers';

const SETTLE_MS = 180;
// Share of the screen a reveal must cover before the glide takes over (15% of it showing)
const SNAP_START = 0.15;

// When scrolling stops part way into a full-screen reveal (the footer), glide
// the rest of the way in the direction the visitor was going: down completes the reveal, up
// gives the screen back to the section above. Stopping before 15% of it shows does nothing.
// Touch glides use the browser's smooth scroll: Lenis does not follow native touch scrolling
export function useStickyRevealSnap(lenis) {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    let lastY = window.scrollY;
    let direction = 0;
    let touching = false;
    let lastInputTouch = false;
    let snapping = false;
    let timer = null;

    const snap = () => {
      if (touching || lenis?.isStopped) return;
      const screen = window.innerHeight;

      for (const reveal of document.querySelectorAll('.sticky-reveal.is-revealing')) {
        const top = reveal.getBoundingClientRect().top;
        if (top <= 2 || top >= screen - 2) continue;

        let target = null;
        if (direction > 0 && top < screen * (1 - SNAP_START)) target = window.scrollY + top;
        if (direction < 0 && top > screen * SNAP_START) target = window.scrollY + top - screen;
        if (target === null) return;

        snapping = true;
        const done = () => {
          snapping = false;
        };
        if (lenis && !lastInputTouch) {
          lenis.scrollTo(target, { duration: 0.9, onComplete: done });
        } else {
          window.scrollTo({ top: target, behavior: 'smooth' });
          setTimeout(done, 900);
        }
        return;
      }
    };

    const onScroll = () => {
      const y = window.scrollY;
      if (y !== lastY) direction = y > lastY ? 1 : -1;
      lastY = y;
      if (snapping) return;
      clearTimeout(timer);
      timer = setTimeout(snap, SETTLE_MS);
    };

    // A finger still on the screen is a scroll in progress, even when the page is not moving
    const onTouchStart = () => {
      touching = true;
      lastInputTouch = true;
      clearTimeout(timer);
    };
    const onTouchEnd = () => {
      touching = false;
      clearTimeout(timer);
      timer = setTimeout(snap, SETTLE_MS);
    };

    const onWheel = () => {
      lastInputTouch = false;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [lenis]);
}
