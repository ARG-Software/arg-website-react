import { createContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useRAF } from '../hooks/useRAF';

gsap.registerPlugin(ScrollTrigger);

export const LenisContext = createContext(null);

/**
 * LenisProvider - Provides Lenis smooth-scrolling instance via React Context.
 * Handles its own resize logic: reacts to route changes and body mutations.
 * Wires Lenis scroll events directly into ScrollTrigger.update.
 */
export function LenisProvider({
  children,
  lerp = 0.1,
  wheelMultiplier = 0.9,
  smoothTouch = false,
}) {
  const [lenis, setLenis] = useState(null);
  const instanceRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    let cancelled = false;
    let mutationObserver = null;
    let resizeObserver = null;
    let resizeTimer = null;

    const initLenis = async () => {
      try {
        const Lenis = (await import('lenis')).default;
        if (cancelled) return;

        const instance = new Lenis({
          lerp,
          wheelMultiplier,
          gestureOrientation: 'vertical',
          normalizeWheel: false,
          smoothTouch,
        });

        if (cancelled) {
          instance.destroy();
          return;
        }

        instanceRef.current = instance;
        setLenis(instance);

        instance.on('scroll', ScrollTrigger.update);

        const resizeAndRefresh = () => {
          instance.resize();
          ScrollTrigger.refresh();
        };

        const debouncedRefresh = () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(resizeAndRefresh, 200);
        };

        mutationObserver = new MutationObserver(debouncedRefresh);
        mutationObserver.observe(document.body, { childList: true, subtree: true });

        resizeObserver = new ResizeObserver(debouncedRefresh);
        resizeObserver.observe(document.body);
      } catch (error) {
        console.error('Failed to initialize Lenis:', error);
      }
    };

    initLenis();

    return () => {
      cancelled = true;
      mutationObserver?.disconnect();
      resizeObserver?.disconnect();
      clearTimeout(resizeTimer);
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
        setLenis(null);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!instanceRef.current) return;
    instanceRef.current.resize();
    ScrollTrigger.refresh();
    const delayedTimer = setTimeout(() => {
      instanceRef.current?.resize();
      ScrollTrigger.refresh();
    }, 1200);
    return () => clearTimeout(delayedTimer);
  }, [location.pathname]);

  useRAF((_delta, elapsed) => {
    if (instanceRef.current) {
      instanceRef.current.raf(elapsed * 1000);
    }
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
