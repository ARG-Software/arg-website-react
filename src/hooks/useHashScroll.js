import { useCallback, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LenisContext } from '../providers/LenisProvider';

const DEFAULT_HASH_SCROLL_DURATION = 1.8;
const DEFAULT_HASH_SCROLL_OFFSET = 0;
const DEFAULT_HASH_SCROLL_DELAY = 650;
const DEFAULT_RETRY_DELAY = 80;
const DEFAULT_MAX_RETRIES = 12;

const easeOutQuart = progress => 1 - Math.pow(1 - progress, 4);

function getHashId(hash) {
  return hash?.startsWith('#') ? hash.slice(1) : hash;
}

export function useHashScroll() {
  const lenis = useContext(LenisContext);
  const lenisRef = useRef(lenis);
  const navigate = useNavigate();

  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  const scrollToElement = useCallback((element, options = {}) => {
    const duration = options.duration ?? DEFAULT_HASH_SCROLL_DURATION;
    const offset = options.offset ?? DEFAULT_HASH_SCROLL_OFFSET;
    const easing = options.easing ?? easeOutQuart;

    document.activeElement?.blur();

    if (lenisRef.current) {
      lenisRef.current.start();
      if (options.immediate) {
        lenisRef.current.scrollTo(element, { offset, immediate: true });
        return;
      }

      lenisRef.current.scrollTo(element, { offset, duration, easing });
      return;
    }

    element.scrollIntoView({ behavior: options.immediate ? 'auto' : 'smooth' });
  }, []);

  const updateHashUrl = useCallback(
    (hashId, options = {}) => {
      if (options.updateUrl === false) return;
      navigate(`#${hashId}`, { replace: options.replace ?? true });
    },
    [navigate]
  );

  const scrollToHash = useCallback(
    (hash, options = {}) => {
      const hashId = getHashId(hash);
      if (!hashId) return false;

      const element = document.getElementById(hashId);
      if (!element) return false;

      const delay = options.mobileMenuDelay ?? DEFAULT_HASH_SCROLL_DELAY;
      window.setTimeout(() => scrollToElement(element, options), delay);
      updateHashUrl(hashId, options);
      return true;
    },
    [scrollToElement, updateHashUrl]
  );

  const scrollToHashWhenReady = useCallback(
    (hash, options = {}) => {
      const hashId = getHashId(hash);
      if (!hashId) return false;

      let attempts = 0;
      const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
      const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY;

      const tryScroll = () => {
        const element = document.getElementById(hashId);
        if (element) {
          scrollToElement(element, options);
          updateHashUrl(hashId, options);
          return;
        }

        if (attempts < maxRetries) {
          attempts += 1;
          window.setTimeout(tryScroll, retryDelay);
        }
      };

      window.setTimeout(tryScroll, options.initialDelay ?? 0);
      return true;
    },
    [scrollToElement, updateHashUrl]
  );

  return { scrollToElement, scrollToHash, scrollToHashWhenReady };
}
