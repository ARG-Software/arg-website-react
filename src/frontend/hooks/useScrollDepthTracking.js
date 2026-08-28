import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '@services/analytics';

const ADMIN_PATH_PATTERN = /^\/admin(?:\/|$)/;
const SCROLL_DEPTH_MILESTONES = [25, 50, 75, 90, 100];

export function useScrollDepthTracking() {
  const location = useLocation();
  const trackedMilestonesRef = useRef(new Set());
  const frameRef = useRef(0);

  useEffect(() => {
    trackedMilestonesRef.current = new Set();
    if (ADMIN_PATH_PATTERN.test(location.pathname)) return undefined;

    function trackDepth() {
      frameRef.current = 0;

      const documentElement = document.documentElement;
      const scrollableHeight = documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) return;

      const percent = Math.min(
        100,
        Math.round(((window.scrollY + window.innerHeight) / documentElement.scrollHeight) * 100)
      );

      for (const milestone of SCROLL_DEPTH_MILESTONES) {
        if (percent < milestone || trackedMilestonesRef.current.has(milestone)) continue;

        trackedMilestonesRef.current.add(milestone);
        trackEvent('scroll_depth', {
          page_path: location.pathname,
          percent: milestone,
        });
      }
    }

    function handleScroll() {
      if (frameRef.current) return;
      frameRef.current = window.requestAnimationFrame(trackDepth);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    };
  }, [location.pathname]);
}
