import { useContext } from 'react';
import { LenisContext } from '../providers/LenisProvider';

/**
 * useLenis - Hook to access the Lenis smooth‑scrolling instance.
 * Returns the Lenis instance from React Context.
 */
export function useLenis() {
  return useContext(LenisContext);
}
