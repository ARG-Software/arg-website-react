import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { trackPageView } from '../hooks/useAnalytics';
import { useHashScroll } from '../hooks/useHashScroll';
import { LenisContext } from './LenisProvider';
import { PAGE_TRANSITION_DURATION_MS } from '../constants';
import { PageTransitionOverlay } from '../components/layout/PageTransitionOverlay';
import { normalizePathname } from '../utils/helpers';

// Module-level variables to track navigation history
let previousPath = '';
let currentPath = '';

const PROJECT_IMAGE_PRELOAD_TIMEOUT_MS = 320;
const INSTANT_HOME_HASH_REVEAL_DELAY_MS = 120;

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

function isModifiedClick(event) {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

function getClickedAnchor(event) {
  if (!(event.target instanceof Element)) return null;
  return event.target.closest('a[href]');
}

function isHomeHashInstantSource(pathname) {
  const normalizedPathname = normalizePathname(pathname);
  return (
    normalizedPathname === '/partners' ||
    normalizedPathname === '/careers' ||
    normalizedPathname === '/blog' ||
    normalizedPathname.startsWith('/blog/')
  );
}

function shouldJumpToHomeHash(currentPathname, targetPathname, hash) {
  return Boolean(
    hash && normalizePathname(targetPathname) === '/' && isHomeHashInstantSource(currentPathname)
  );
}

export const TransitionContext = createContext(null);

export function TransitionProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();

  const [phase, setPhase] = useState('idle'); // idle | covering | revealing
  const [overlayVariant, setOverlayVariant] = useState('default'); // default | project-image
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
          targetElement = document.getElementById('partners-marquee');
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

  // Enhanced go function that handles both page transitions and hash scrolling
  const go = useCallback(
    (to, options) => {
      if (!to) return;
      if (isRunningRef.current) return;

      const [path, hash] = to.split('#');
      const targetPath = path || location.pathname;
      const isSamePath = normalizePathname(targetPath) === normalizePathname(location.pathname);
      const shouldUseInstantHomeHash = shouldJumpToHomeHash(location.pathname, targetPath, hash);
      const transitionOptions = shouldUseInstantHomeHash
        ? { ...options, scrollMode: options?.scrollMode ?? 'instant-home-hash' }
        : options;

      if (hash && isSamePath) {
        scrollToHash(hash, transitionOptions);
        return;
      }

      // If already there, scroll to top
      if (typeof to === 'string' && isSamePath && !hash) {
        scrollToReturnTarget();
        return;
      }

      // Cross-page navigation with transition
      isRunningRef.current = true;
      pendingToRef.current = { to, options: transitionOptions, hash };

      const variant =
        transitionOptions?.transition === 'project-image' ? 'project-image' : 'default';
      setOverlayVariant(variant);
      setImageTransition(transitionOptions?.sourceImage ?? null);

      // stop scroll if you use Lenis
      if (lenis) lenis.stop();

      const startCover = () => {
        setPhase('covering');

        const { cover } = getTransitionTimings(variant);
        window.setTimeout(() => {
          navigate(hash ? targetPath : to, getNavigateOptions(transitionOptions));
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
      scrollToHash,
      scrollToReturnTarget,
      lenis,
      getTransitionTimings,
      getNavigateOptions,
    ]
  );

  useEffect(() => {
    const handleHashAnchorClick = event => {
      const anchor = getClickedAnchor(event);
      if (!anchor) return;
      if (event.defaultPrevented || event.button !== 0 || isModifiedClick(event)) return;
      if (anchor.target && anchor.target !== '_self') return;
      if (anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;

      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || !url.hash) return;

      const hash = url.hash.slice(1);
      if (!hash) return;

      event.preventDefault();

      const isSamePath =
        normalizePathname(url.pathname) === normalizePathname(location.pathname) &&
        url.search === location.search;

      if (isSamePath) {
        scrollToHash(hash, { mobileMenuDelay: 0 });
        return;
      }

      go(`${url.pathname}${url.search}${url.hash}`);
    };

    document.addEventListener('click', handleHashAnchorClick);
    return () => document.removeEventListener('click', handleHashAnchorClick);
  }, [go, location.pathname, location.search, scrollToHash]);

  // When the route actually changes, reveal
  useEffect(() => {
    // Update navigation history
    previousPath = currentPath;
    currentPath = location.pathname;

    // Fire GA4 page_view for SPA navigation
    trackPageView(location.pathname + location.search + location.hash);

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
    const shouldRevealAfterInstantHash =
      pendingHash && pendingToRef.current?.options?.scrollMode === 'instant-home-hash';
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
            if (pendingHash && !shouldRevealAfterInstantHash) {
              scrollToHashWhenReadyRef.current(pendingHash, {
                initialDelay: 80,
                mobileMenuDelay: 0,
              });
            }
          }, reveal);
        });
      });
    };

    if (shouldRevealAfterInstantHash) {
      scrollToHashWhenReadyRef.current(pendingHash, {
        initialDelay: 0,
        mobileMenuDelay: 0,
        immediate: true,
      });
      window.setTimeout(revealPage, INSTANT_HOME_HASH_REVEAL_DELAY_MS);
      return;
    }

    window.setTimeout(revealPage, 0);
    // Only pathname changes represent real page transitions.
    // Hash changes are handled by scrollToHash (pushState) and must NOT
    // retrigger this effect — otherwise the cover→reveal cycle fires spuriously
    // ~1–2 s after load when lenis init causes scrollToHash to be recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, navigationType]);

  // Create a click handler for hash scrolling (e.g., HeroSection, AboutSection)
  const createHashScrollHandler = (hash, options = {}) => {
    return event => {
      if (event) event.preventDefault();
      scrollToHash(hash, options);
    };
  };

  const contextValue = {
    go,
    phase,
    scrollToHash,
    scrollToPage: scrollToReturnTarget,
    createHashScrollHandler,
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
