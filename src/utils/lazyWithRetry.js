import { lazy } from 'react';

const RELOAD_FLAG = 'arg:lazyReload';

function isChunkLoadError(error) {
  if (!error) return false;
  const name = error.name || '';
  const message = error.message || '';
  return (
    name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message) ||
    /Loading CSS chunk \d+ failed/i.test(message)
  );
}

export function lazyWithRetry(loader) {
  return lazy(() =>
    loader().catch(error => {
      if (!isChunkLoadError(error)) throw error;
      if (typeof window === 'undefined') throw error;

      const alreadyReloaded = window.sessionStorage.getItem(RELOAD_FLAG) === '1';
      if (alreadyReloaded) throw error;

      window.sessionStorage.setItem(RELOAD_FLAG, '1');
      const { pathname, search, hash } = window.location;
      window.location.replace(pathname + search + hash);
      return new Promise(() => {});
    })
  );
}
