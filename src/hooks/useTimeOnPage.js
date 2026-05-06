import { useEffect, useRef } from 'react';
import { trackTimeOnPage } from './useAnalytics';

/**
 * Track time spent on a page.
 * Fires a 'time_on_page' GA4 event when the component unmounts.
 *
 * @param {string} pagePath - The path to report (e.g., `/projects/mojaloop/`)
 * @param {number} [minSeconds=5] - Minimum seconds before firing (prevents accidental bounces)
 */
export function useTimeOnPage(pagePath, minSeconds = 5) {
  const startTimeRef = useRef(null);

  useEffect(() => {
    startTimeRef.current = Date.now();

    return () => {
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (duration >= minSeconds) {
        trackTimeOnPage(pagePath, duration);
      }
    };
  }, [pagePath, minSeconds]);
}
