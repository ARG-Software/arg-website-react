import { createContext, useCallback, useEffect, useRef } from 'react';

export const RAFContext = createContext(null);

export function RAFProvider({ children }) {
  const callbacksRef = useRef(new Map());
  const rafIdRef = useRef(null);
  const lastTimeRef = useRef(0);
  const elapsedRef = useRef(0);
  const pausedRef = useRef(false);
  const tickRef = useRef(null);

  // Main animation loop — defined once via ref to avoid circular dependency
  useEffect(() => {
    const tick = time => {
      if (pausedRef.current) return;

      const delta = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0;
      lastTimeRef.current = time;
      elapsedRef.current += delta;

      // Poll transition state once per frame (no extra rAF loop)
      const overlay = document.querySelector('.pt-overlay');
      const transitioning = overlay
        ? overlay.classList.contains('covering') || overlay.classList.contains('revealing')
        : false;

      const callbacks = callbacksRef.current;
      if (callbacks.size > 0) {
        callbacks.forEach(cb => {
          try {
            cb(delta, elapsedRef.current, transitioning);
          } catch (err) {
            console.error('[RAF] Callback error:', err);
          }
        });
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    tickRef.current = tick;

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, []);

  // Visibility change — pause all rAF when tab is hidden
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        pausedRef.current = true;
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
          rafIdRef.current = null;
        }
      } else {
        pausedRef.current = false;
        lastTimeRef.current = 0;
        if (tickRef.current) {
          rafIdRef.current = requestAnimationFrame(tickRef.current);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Subscribe / unsubscribe API
  const subscribe = useCallback((id, callback) => {
    callbacksRef.current.set(id, callback);
  }, []);

  const unsubscribe = useCallback(id => {
    callbacksRef.current.delete(id);
  }, []);

  const contextValue = {
    subscribe,
    unsubscribe,
  };

  return <RAFContext.Provider value={contextValue}>{children}</RAFContext.Provider>;
}
