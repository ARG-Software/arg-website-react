import { createContext, useEffect, useRef, useState } from 'react';

export const LenisContext = createContext(null);

/**
 * LenisProvider - Provides Lenis smooth‑scrolling instance via React Context.
 */
export function LenisProvider({
  children,
  lerp = 0.1,
  wheelMultiplier = 0.9,
  smoothTouch = false,
}) {
  const [lenis, setLenis] = useState(null);
  const initializedRef = useRef(false);
  const rafIdRef = useRef(null);
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

        // Store instance in ref for RAF loop safety
        instanceRef.current = instance;

        // RAF loop
        function raf(time) {
          // Ensure we're still using the same instance
          if (instanceRef.current !== instance) return;
          instance.raf(time);
          rafIdRef.current = requestAnimationFrame(raf);
        }
        rafIdRef.current = requestAnimationFrame(raf);

        console.log('Lenis initialized via Provider');
      } catch (error) {
        console.error('Failed to initialize Lenis:', error);
      }
    };

    initLenis();

    // Cleanup on app unmount
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (lenis) {
        console.log('Lenis cleanup (app unmount)');
        lenis.destroy();
        setLenis(null);
        instanceRef.current = null;
      }
      initializedRef.current = false;
    };
  }, [lerp, wheelMultiplier, smoothTouch]); // eslint-disable-line react-hooks/exhaustive-deps

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
