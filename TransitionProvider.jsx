// TransitionProvider.jsx
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const TransitionContext = createContext(null);

const DURATION_MS = 380;

export function TransitionProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [phase, setPhase] = useState("idle"); // idle | covering | revealing
  const pendingToRef = useRef(null);
  const isRunningRef = useRef(false);
  const lastPathRef = useRef(location.pathname);

  const go = useCallback(
    (to, options) => {
      if (!to) return;
      if (isRunningRef.current) return;

      // If already there, do nothing.
      if (typeof to === "string" && to === location.pathname) return;

      isRunningRef.current = true;
      pendingToRef.current = { to, options };

      // stop scroll if you use Lenis
      if (window.lenis) window.lenis.stop();

      setPhase("covering");

      window.setTimeout(() => {
        navigate(to, options);
      }, DURATION_MS);
    },
    [navigate, location.pathname]
  );

  // When the route actually changes, reveal
  useEffect(() => {
    if (location.pathname === lastPathRef.current) return;

    lastPathRef.current = location.pathname;

    // We may arrive here either via go() or via normal <Link>
    // If it wasn't via go(), still animate.
    if (!isRunningRef.current) {
      // run a full cover→swap→reveal sequence even for default navigation
      isRunningRef.current = true;
      if (window.lenis) window.lenis.stop();
      setPhase("covering");

      window.setTimeout(() => {
        setPhase("revealing");
        window.setTimeout(() => {
          setPhase("idle");
          isRunningRef.current = false;
          if (window.lenis) window.lenis.start();
        }, DURATION_MS);
      }, DURATION_MS);

      return;
    }

    // go() path: we already covered, now reveal
    setPhase("revealing");
    window.setTimeout(() => {
      setPhase("idle");
      isRunningRef.current = false;
      pendingToRef.current = null;
      if (window.lenis) window.lenis.start();
    }, DURATION_MS);
  }, [location.pathname]);

  return (
    <TransitionContext.Provider value={{ go, phase }}>
      {/* overlay lives once here */}
      <div className={`pt-overlay ${phase}`} aria-hidden="true" />
      {children}
    </TransitionContext.Provider>
  );
}

export function usePageTransition() {
  const ctx = useContext(TransitionContext);
  if (!ctx) throw new Error("usePageTransition must be used inside TransitionProvider");
  return ctx;
}

export const PAGE_TRANSITION_DURATION_MS = DURATION_MS;
