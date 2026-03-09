import { useEffect, useRef } from 'react';

export const useLenis = () => {
  const lenisRef = useRef(null);

  useEffect(() => {
    // Wait for Lenis to be loaded
    const initLenis = () => {
      if (typeof window.Lenis === 'undefined') {
        setTimeout(initLenis, 100);
        return;
      }

      const lenis = new window.Lenis({
        lerp: 0.1,
        wheelMultiplier: 0.9,
        gestureOrientation: "vertical",
        normalizeWheel: false,
        smoothTouch: false
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }

      requestAnimationFrame(raf);
      lenisRef.current = lenis;

      // Add to window for external scripts
      window.lenis = lenis;
    };

    initLenis();

    return () => {
      if (lenisRef.current) {
        lenisRef.current.destroy();
      }
    };
  }, []);

  return lenisRef;
};
