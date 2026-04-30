import { createContext, useEffect, useRef, useState } from 'react';
import { useRAF } from '../hooks/useRAF';

export const LenisContext = createContext(null);

/**
 * LenisProvider - Provides Lenis smooth-scrolling instance via React Context.
 * Now uses the RAF coordinator instead of its own rAF loop.
 */
export function LenisProvider({
  children,
  lerp = 0.1,
  wheelMultiplier = 0.9,
  smoothTouch = false,
}) {
  const [lenis, setLenis] = useState(null);
  const initializedRef = useRef(false);
  const instanceRef = useRef(null);

  useEffect(() => {
    // Prevent multiple initializations
    if (initializedRef.current) return;

    const initLenis = async () => {
      try {
        const Lenis = (await import('lenis')).default;
        const instance = new Lenis({
          lerp,
          wheelMultiplier,
          gestureOrientation: 'vertical',
          normalizeWheel: false,
          smoothTouch,
        });

        // Store in state for React consumers
        setLenis(instance);
        initializedRef.current = true;

        // Store instance in ref for safety
        instanceRef.current = instance;
      } catch (error) {
        console.error('Failed to initialize Lenis:', error);
      }
    };

    initLenis();

    // Cleanup on app unmount
    return () => {
      if (lenis) {
        lenis.destroy();
        setLenis(null);
        instanceRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [lerp, wheelMultiplier, smoothTouch]); // eslint-disable-line react-hooks/exhaustive-deps

  // Subscribe to the RAF coordinator for the Lenis rAF loop
  useRAF(time => {
    if (instanceRef.current) {
      instanceRef.current.raf(time);
    }
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
