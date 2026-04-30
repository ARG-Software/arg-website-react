import { useEffect, useRef, useCallback } from 'react';
import { RAFContext } from '../providers/RAFProvider';
import { useContext } from 'react';

export function useRAF(callback, deps = []) {
  const ctx = useContext(RAFContext);
  const callbackRef = useRef(callback);
  const idRef = useRef(Symbol('raf-subscriber'));

  // Keep the callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback, ...deps]);

  // Subscribe / unsubscribe
  useEffect(() => {
    if (!ctx || !ctx.subscribe) return;

    const id = idRef.current;
    const stableCallback = (delta, elapsed, transitioning) => {
      callbackRef.current(delta, elapsed, transitioning);
    };

    ctx.subscribe(id, stableCallback);

    return () => {
      ctx.unsubscribe(id);
    };
  }, [ctx]);
}

export function useTransitioning() {
  const transitioningRef = useRef(false);

  const checkTransitioning = useCallback(() => {
    const overlay = document.querySelector('.pt-overlay');
    if (overlay) {
      transitioningRef.current =
        overlay.classList.contains('covering') || overlay.classList.contains('revealing');
    }
    return transitioningRef.current;
  }, []);

  return checkTransitioning;
}
