import { createContext, useState } from 'react';
import { LoadingScreen } from '../components';

export const LoadingContext = createContext(true);

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

  const handleComplete = () => {
    sessionStorage.setItem(LOADING_SEEN_KEY, 'true');
    setDone(true);
  };

  return (
    <LoadingContext.Provider value={done}>
      {shouldShow && !done && <LoadingScreen onComplete={handleComplete} />}
      {children}
    </LoadingContext.Provider>
  );
}
