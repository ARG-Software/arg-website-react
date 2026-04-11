import { createContext, useState } from 'react';
import { LoadingScreen } from '../components';

export const LoadingContext = createContext(true);

export function LoadingProvider({ children }) {
  const [done, setDone] = useState(false);
  return (
    <LoadingContext.Provider value={done}>
      {!done && <LoadingScreen onComplete={() => setDone(true)} />}
      {children}
    </LoadingContext.Provider>
  );
}
