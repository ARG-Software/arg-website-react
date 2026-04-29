import { createContext, useEffect, useState } from 'react';
import { LoadingScreen } from '../components';
import PROJECTS from '../data/projects.json';

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

  useEffect(() => {
    if (!shouldShow) return;

    PROJECTS.forEach(project => {
      if (project.imgSrc) {
        const img = new Image();
        img.src = project.imgSrc;
      }
      if (project.mockupSrc) {
        const img = new Image();
        img.src = project.mockupSrc;
      }
    });
  }, [shouldShow]);

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
