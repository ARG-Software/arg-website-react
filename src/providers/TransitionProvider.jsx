import { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { trackPageView } from '../hooks/useAnalytics';
import { useLenis } from '../hooks/useLenis';
import { PAGE_TRANSITION_DURATION_MS } from '../constants';

// Module-level variables to track navigation history
let previousPath = '';
let currentPath = '';

export const TransitionContext = createContext(null);

export function TransitionProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState('idle'); // idle | covering | revealing
  const pendingToRef = useRef(null);
  const isRunningRef = useRef(false);
  const isInitialLoadRef = useRef(true);
  const lastPathRef = useRef(location.pathname);
  const hashRef = useRef(location.hash);
  const transitionStartTimeRef = useRef(0);
  const lenis = useLenis();
  // Stable ref so the route-change effect doesn't re-fire when lenis initialises
  const lenisRef = useRef(lenis);
  useEffect(() => {
    lenisRef.current = lenis;
  }, [lenis]);

  // Keep hashRef updated with current location.hash
  useEffect(() => {
    hashRef.current = location.hash;
  }, [location.hash]);

  // Initialize currentPath on first load
  useEffect(() => {
    if (currentPath === '') {
      currentPath = location.pathname;
    }
  }, [location.pathname]);

  // Same-page hash scrolling with Lenis
  const scrollToHash = useCallback(
    (hash, options = {}) => {
      if (!hash) return false;

      const element = document.getElementById(hash);
      if (!element) return false;

      const mobileMenuDelay = options.mobileMenuDelay ?? 400;
      const duration = options.duration ?? 1.8;
      const offset = options.offset ?? 0;
      const easing = options.easing ?? (progress => 1 - Math.pow(1 - progress, 4)); // ease-out quart

      const doScroll = () => {
        if (lenis) {
          lenis.start();
          lenis.scrollTo(element, { offset, duration, easing });
        } else {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      };

      setTimeout(doScroll, mobileMenuDelay);
      window.history.pushState(null, '', `#${hash}`);
      return true;
    },
    [lenis]
  );

  // Scroll to appropriate section based on navigation history with retry logic
  const scrollToPage = useCallback(() => {
    // Wait 50ms for React to start rendering
    setTimeout(() => {
      const tryScroll = (attempt = 0) => {
        let targetElement = null;

        // FIRST: Check for hash in URL and scroll to it
        if (hashRef.current) {
          const hashId = hashRef.current.substring(1);
          targetElement = document.getElementById(hashId);
          if (targetElement) {
            targetElement.scrollIntoView();
            return;
          }
        }

        // SECOND: Check special transition cases
        if (previousPath === '/partners' && currentPath === '/' && !hashRef.current) {
          targetElement = document.getElementById('partners-marquee');
        } else if (
          (previousPath === '/articles' || previousPath.startsWith('/articles/')) &&
          currentPath === '/' &&
          !hashRef.current
        ) {
          targetElement = document.getElementById('articles-promo');
        }

        // If target element found, scroll to it
        if (targetElement) {
          targetElement.scrollIntoView(); // Quick scroll, no smooth
          return;
        }

        // If element not found, retry based on attempt count
        if (attempt === 0) {
          // First retry after 100ms
          setTimeout(() => tryScroll(1), 20);
        } else if (attempt === 1) {
          // Second retry after 200ms total
          setTimeout(() => tryScroll(2), 30);
        } else {
          // Fallback to top after all retries
          window.scrollTo({ top: 0 });
        }
      };

      // Start trying
      tryScroll();
    }, 2);
  }, []);

  // Enhanced go function that handles both page transitions and hash scrolling
  const go = useCallback(
    (to, options) => {
      if (!to) return;
      if (isRunningRef.current) return;

      // Parse hash from URL
      const [path, hash] = to.split('#');
      const targetPath = path || '/';
      const currentPath = location.pathname;

      // Same-page hash scrolling
      if (hash && targetPath === currentPath) {
        scrollToHash(hash, options);
        return;
      }

      // If already there, scroll to top
      if (typeof to === 'string' && to === location.pathname) {
        scrollToPage({ duration: 0.8 });
        return;
      }

      // Cross-page navigation with transition
      isRunningRef.current = true;
      pendingToRef.current = { to, options };

      // stop scroll if you use Lenis
      if (lenis) lenis.stop();

      transitionStartTimeRef.current = Date.now();
      setPhase('covering');

      window.setTimeout(() => {
        navigate(to, options);
      }, PAGE_TRANSITION_DURATION_MS);
    },
    [navigate, location.pathname, scrollToHash, scrollToPage, lenis]
  );

  // When the route actually changes, reveal
  useEffect(() => {
    // Update navigation history
    previousPath = currentPath;
    currentPath = location.pathname;

    lastPathRef.current = location.pathname;

    // Fire GA4 page_view for SPA navigation
    trackPageView(location.pathname + location.search + location.hash);

    const unlockScroll = () => {
      if (lenisRef.current) lenisRef.current.start();
      document.documentElement.classList.remove('lenis-stopped');
    };

    // Scroll to top while the overlay is still covering — user never sees the jump.
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

    // We may arrive here either via go() or via normal <Link>
    // If it wasn't via go(), still animate.
    if (!isRunningRef.current) {
      isRunningRef.current = true;
      if (lenisRef.current) lenisRef.current.stop();

      transitionStartTimeRef.current = Date.now();

      window.setTimeout(() => {
        setPhase('covering');
        scrollToTop(); // Scroll while covered — invisible to user

        window.setTimeout(() => {
          setPhase('revealing');
          window.setTimeout(() => {
            setPhase('idle');
            isRunningRef.current = false;
            unlockScroll();
          }, PAGE_TRANSITION_DURATION_MS);
        }, PAGE_TRANSITION_DURATION_MS);
      }, 0);

      return;
    }

    // go() path: overlay already covering — scroll now then reveal
    scrollToTop();
    window.setTimeout(() => {
      setPhase('revealing');
      window.setTimeout(() => {
        setPhase('idle');
        isRunningRef.current = false;
        pendingToRef.current = null;
        unlockScroll();
      }, PAGE_TRANSITION_DURATION_MS);
    }, 0);
    // Only pathname changes represent real page transitions.
    // Hash changes are handled by scrollToHash (pushState) and must NOT
    // retrigger this effect — otherwise the cover→reveal cycle fires spuriously
    // ~1–2 s after load when lenis init causes scrollToHash to be recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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
    scrollToPage,
    createHashScrollHandler,
  };

  return (
    <TransitionContext.Provider value={contextValue}>
      {/* overlay lives once here */}
      <div className={`pt-overlay ${phase}`} aria-hidden="true" />
      {children}
    </TransitionContext.Provider>
  );
}
