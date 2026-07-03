import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { trackEvent, trackPageView } from '../utils/analytics';
import { useHashScroll } from '../hooks/useHashScroll';
import { LenisContext } from './LenisProvider';
import { PAGE_TRANSITION_DURATION_MS } from '@constants/config';
import { PageTransitionOverlay } from '../components/layout/PageTransitionOverlay';
import { normalizePathname } from '../utils/helpers';

// Module-level variables to track navigation history
let previousPath = '';
let currentPath = '';

const PROJECT_IMAGE_PRELOAD_TIMEOUT_MS = 320;
const HASH_REVEAL_DELAY_MS = 120;

function preloadTransitionImage(sourceImage) {
  if (!sourceImage?.src || typeof window === 'undefined') {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    let settled = false;
    const image = new Image();
    const timeout = window.setTimeout(() => finish(), PROJECT_IMAGE_PRELOAD_TIMEOUT_MS);

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve();
    };

    image.decoding = 'async';
    if ('fetchPriority' in image) image.fetchPriority = 'high';
    if (sourceImage.sizes) image.sizes = sourceImage.sizes;
    if (sourceImage.srcSet) image.srcset = sourceImage.srcSet;
    image.src = sourceImage.src;

    if (image.decode) {
      image.decode().then(finish, finish);
      return;
    }

    image.onload = finish;
    image.onerror = finish;
  });
}

function getTargetLocation(to) {
  if (typeof to !== 'string' || typeof window === 'undefined') {
    return { pathname: '', search: '', hash: '' };
  }

  const url = new URL(to, window.location.href);
  return {
    pathname: url.pathname,
    search: url.search,
    hash: url.hash ? url.hash.slice(1) : '',
  };
}

function getPathWithSearch(location) {
  return `${location.pathname}${location.search}`;
}

function trackSectionNavigation(section, sourcePath, targetPath) {
  trackEvent('section_navigation', {
    section,
    source_path: sourcePath,
    target_path: targetPath,
  });
}

export const TransitionContext = createContext(null);

export function TransitionProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();

  const [phase, setPhase] = useState('idle'); // idle | covering | revealing
  const [overlayVariant, setOverlayVariant] = useState('curtain'); // curtain | default | project-image
  const [imageTransition, setImageTransition] = useState(null);
  const overlayRef = useRef(null);
  const pendingToRef = useRef(null);
  const isRunningRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const lenis = useContext(LenisContext);
  const { scrollToHash, scrollToHashWhenReady } = useHashScroll();
  // Stable ref so the route-change effect doesn't re-fire when lenis initialises
  const lenisRef = useRef(lenis);
  const scrollToHashWhenReadyRef = useRef(scrollToHashWhenReady);

  const getTransitionTimings = useCallback(variant => {
    if (variant === 'project-image') {
      return { cover: 760, reveal: 300 };
    }

    if (variant === 'curtain') {
      return { cover: 560, reveal: 420 };
    }

    return {
      cover: Math.max(PAGE_TRANSITION_DURATION_MS, 1680),
      reveal: 820,
    };
  }, []);

  const getNavigateOptions = useCallback(options => {
    if (!options) return undefined;

    const navigateOptions = { ...options };
    delete navigateOptions.transition;
    delete navigateOptions.sourceImage;
    delete navigateOptions.scrollMode;
    delete navigateOptions.updateUrl;
    delete navigateOptions.mobileMenuDelay;
    delete navigateOptions.duration;
    delete navigateOptions.easing;
    delete navigateOptions.offset;
    delete navigateOptions.immediate;
    delete navigateOptions.initialDelay;
    delete navigateOptions.retryDelay;
    delete navigateOptions.maxRetries;

    return Object.keys(navigateOptions).length > 0 ? navigateOptions : undefined;
  }, []);

  useEffect(() => {
    const isTransitioning = phase === 'covering' || phase === 'revealing';
    document.documentElement.classList.toggle('is-page-transitioning', isTransitioning);

    return () => {
      document.documentElement.classList.remove('is-page-transitioning');
    };
  }, [phase]);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  useEffect(() => {
    scrollToHashWhenReadyRef.current = scrollToHashWhenReady;
  }, [scrollToHashWhenReady]);

  useEffect(() => {
    return () => {
      if (lenisRef.current) lenisRef.current.start();
      document.documentElement.classList.remove('lenis-stopped');
    };
  }, []);

  // Initialize currentPath on first load
  useEffect(() => {
    if (currentPath === '') {
      currentPath = location.pathname;
    }
  }, [location.pathname]);

  const scrollToReturnTarget = useCallback(() => {
    setTimeout(() => {
      const tryScroll = (attempt = 0) => {
        let targetElement = null;

        if (previousPath === '/partners' && currentPath === '/') {
          targetElement = document.getElementById('partners');
        } else if (
          (previousPath === '/blog' || previousPath.startsWith('/blog/')) &&
          currentPath === '/'
        ) {
          targetElement = document.getElementById('blog-promo');
        }

        if (targetElement) {
          targetElement.scrollIntoView();
          return;
        }

        if (attempt === 0) {
          setTimeout(() => tryScroll(1), 20);
        } else if (attempt === 1) {
          setTimeout(() => tryScroll(2), 30);
        } else {
          window.scrollTo({ top: 0 });
        }
      };

      tryScroll();
    }, 2);
  }, []);

  // Explicit navigation entry point used by AppLink. Browser POP navigation never calls this.
  const go = useCallback(
    (to, options) => {
      if (!to) return;
      if (isRunningRef.current) return;

      const transitionOptions = options ?? {};
      const targetLocation = getTargetLocation(to);
      const targetPath = getPathWithSearch(targetLocation);
      const currentPath = `${location.pathname}${location.search}`;
      const isSamePath =
        normalizePathname(targetLocation.pathname) === normalizePathname(location.pathname) &&
        targetLocation.search === location.search;

      if (targetLocation.hash && isSamePath) {
        trackSectionNavigation(targetLocation.hash, currentPath, targetPath);
        scrollToHash(targetLocation.hash, { ...transitionOptions, updateUrl: false });
        return;
      }

      // If already there, scroll to top
      if (typeof to === 'string' && isSamePath && !targetLocation.hash) {
        scrollToReturnTarget();
        return;
      }

      if (transitionOptions.transition === 'none') {
        navigate(targetLocation.hash ? targetPath : to, getNavigateOptions(transitionOptions));
        return;
      }

      if (targetLocation.hash) {
        trackSectionNavigation(targetLocation.hash, currentPath, targetPath);
      }

      // Cross-page navigation with transition
      isRunningRef.current = true;
      pendingToRef.current = {
        to: targetLocation.hash ? targetPath : to,
        options: transitionOptions,
        hash: targetLocation.hash,
      };

      const variant =
        transitionOptions.transition === 'project-image'
          ? 'project-image'
          : transitionOptions.transition === 'page'
            ? 'default'
            : 'curtain';
      setOverlayVariant(variant);
      setImageTransition(transitionOptions?.sourceImage ?? null);

      // stop scroll if you use Lenis
      if (lenis) {
        lenis.stop();
        document.documentElement.classList.add('lenis-stopped');
        // Safety net: if the route-change reveal path never runs, restart Lenis
        // after the worst-case transition window so the page can never be stuck.
        const safetyUnlockMs =
          getTransitionTimings(variant).cover + getTransitionTimings(variant).reveal + 4000;
        window.setTimeout(() => {
          if (lenisRef.current) lenisRef.current.start();
          document.documentElement.classList.remove('lenis-stopped');
        }, safetyUnlockMs);
      }

      const startCover = () => {
        setPhase('covering');

        const { cover } = getTransitionTimings(variant);
        window.setTimeout(() => {
          navigate(targetLocation.hash ? targetPath : to, getNavigateOptions(transitionOptions));
        }, cover);
      };

      if (variant === 'project-image') {
        preloadTransitionImage(transitionOptions?.sourceImage).then(startCover);
        return;
      }

      startCover();
    },
    [
      navigate,
      location.pathname,
      location.search,
      scrollToHash,
      scrollToReturnTarget,
      lenis,
      getTransitionTimings,
      getNavigateOptions,
    ]
  );

  useEffect(() => {
    trackPageView(location.pathname + location.search);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!location.hash || isRunningRef.current || navigationType !== 'POP') return;

    scrollToHashWhenReadyRef.current(location.hash.slice(1), {
      updateUrl: false,
      mobileMenuDelay: 0,
      initialDelay: 0,
      immediate: true,
    });
  }, [location.pathname, location.search, location.hash, navigationType]);

  // When the route actually changes, reveal
  useEffect(() => {
    // Update navigation history
    previousPath = currentPath;
    currentPath = location.pathname;

    const unlockScroll = () => {
      if (lenisRef.current) lenisRef.current.start();
      document.documentElement.classList.remove('lenis-stopped');
    };

    // Scroll to top while the overlay is covering — user never sees the jump.
    const scrollToTop = () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (lenisRef.current) lenisRef.current.scrollTo(0, { immediate: true });
    };

    // On the very first render there is no navigation — let browser restore position.
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      unlockScroll();
      return;
    }

    // Only explicit go() navigations animate. Browser back/forward and other
    // route changes should render immediately without the page transition.
    if (!isRunningRef.current) {
      unlockScroll();
      return;
    }

    // go() path: overlay already covering — restore the destination top while hidden.
    const pendingHash = pendingToRef.current?.hash;
    scrollToTop();

    const { reveal } = getTransitionTimings(overlayVariant);

    const revealPage = () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPhase('revealing');
          window.setTimeout(() => {
            setPhase('idle');
            setImageTransition(null);
            isRunningRef.current = false;
            pendingToRef.current = null;
            unlockScroll();
          }, reveal);
        });
      });
    };

    if (pendingHash) {
      scrollToHashWhenReadyRef.current(pendingHash, {
        updateUrl: false,
        initialDelay: 0,
        mobileMenuDelay: 0,
        immediate: true,
      });
      window.setTimeout(revealPage, HASH_REVEAL_DELAY_MS);
      return;
    }

    window.setTimeout(revealPage, 0);
    // Hash-only navigation is handled by scrollToHash and the POP restoration effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, navigationType]);

  const contextValue = {
    go,
    phase,
    scrollToHash,
    scrollToPage: scrollToReturnTarget,
    transitioning: phase === 'covering' || phase === 'revealing',
  };

  return (
    <TransitionContext.Provider value={contextValue}>
      {/* overlay lives once here */}
      <div ref={overlayRef}>
        <PageTransitionOverlay
          phase={phase}
          variant={overlayVariant}
          imageTransition={imageTransition}
        />
      </div>
      {children}
    </TransitionContext.Provider>
  );
}
