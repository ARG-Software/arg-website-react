import { createContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const LenisContext = createContext(null);

/**
 * LenisProvider - Provides Lenis smooth-scrolling instance via React Context.
 * Uses Lenis's own requestAnimationFrame loop (autoRaf: true) to keep scroll
 * updates isolated from the app's shared animation loop.
 *
 * Resize/refresh is triggered only on route changes; dynamic sections should
 * call ScrollTrigger.refresh() locally when they need it.
 */
export function LenisProvider({ children, lerp = 0.1, wheelMultiplier = 0.9, syncTouch = false }) {
  const [lenis, setLenis] = useState(null);
  const instanceRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;

    const initLenis = async () => {
      try {
        const Lenis = (await import('lenis')).default;
        if (cancelled) return;

        const instance = new Lenis({
          autoRaf: true,
          smoothWheel: true,
          lerp,
          wheelMultiplier,
          gestureOrientation: 'vertical',
          syncTouch,
        });

        if (cancelled) {
          instance.destroy();
          return;
        }

        instanceRef.current = instance;
        setLenis(instance);

        instance.on('scroll', ScrollTrigger.update);
      } catch (error) {
        console.error('Failed to initialize Lenis:', error);
      }
    };

    initLenis();

    return () => {
      cancelled = true;
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
        setLenis(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const instance = instanceRef.current;
    if (!instance) return undefined;

    let rafId = null;
    let retryTimer = null;

    const refresh = () => {
      instance.resize();
      ScrollTrigger.refresh();
    };

    rafId = requestAnimationFrame(() => {
      refresh();
      retryTimer = setTimeout(refresh, 800);
    });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (retryTimer !== null) clearTimeout(retryTimer);
    };
  }, [location.pathname]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
