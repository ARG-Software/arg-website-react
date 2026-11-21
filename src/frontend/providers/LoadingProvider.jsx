import { createContext, useEffect, useState } from 'react';
import { LoadingScreen } from '@components/layout/LoadingScreen';

export const LoadingContext = createContext(true);
// True once the intro's exit ring has finished; heavy WebGL start-up waits for this so it does
// not stall the burst
export const LoaderGoneContext = createContext(true);

const LOADING_SEEN_KEY = 'loadingScreenSeen';

const shouldShowLoading = () => {
  const isHomepage = window.location.pathname === '/';
  const alreadySeen = sessionStorage.getItem(LOADING_SEEN_KEY) === 'true';
  return isHomepage && !alreadySeen;
};

const initialShouldShow = shouldShowLoading();

export function LoadingProvider({ children }) {
  const [done, setDone] = useState(!initialShouldShow);
  const [shouldShow] = useState(initialShouldShow);
  const [ready, setReady] = useState(false);
  // The page starts at the intro's burst (done); the loader stays mounted until its ring is gone
  const [loaderGone, setLoaderGone] = useState(!initialShouldShow);

  useEffect(() => {
    if (!shouldShow) {
      // Slight delay when skipping loading screen to prevent flash
      const timer = setTimeout(() => setReady(true), 120);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setReady(true), 0);
      return () => clearTimeout(timer);
    }
  }, [shouldShow]);

  const handleComplete = () => {
    sessionStorage.setItem(LOADING_SEEN_KEY, 'true');
    setDone(true);
  };

  return (
    <LoadingContext.Provider value={done}>
      <LoaderGoneContext.Provider value={loaderGone}>
        {shouldShow && !loaderGone && (
          <LoadingScreen onReveal={handleComplete} onComplete={() => setLoaderGone(true)} />
        )}
        <div style={{ opacity: ready ? 1 : 0, transition: 'opacity 120ms ease' }}>{children}</div>
      </LoaderGoneContext.Provider>
    </LoadingContext.Provider>
  );
}
