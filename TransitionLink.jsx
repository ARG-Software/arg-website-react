import React from "react";
import { useLocation } from "react-router-dom";
import { usePageTransition } from "./TransitionProvider";

export default function TransitionLink({ to, children, onClick, ...rest }) {
  const { go } = usePageTransition();
  const location = useLocation();

  return (
    <a
      href={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        e.preventDefault();

        const [path, hash] = to.split('#');
        const targetPath = path || '/';
        const currentPath = location.pathname;

        if (hash && targetPath === currentPath) {
          // Let the mobile menu close first, then scroll
          const doScroll = () => {
  const el = document.getElementById(hash);
  if (!el) return;

  if (window.lenis) {
    window.lenis.start();
    window.lenis.scrollTo(el, {
      offset: 0,
      duration: 1.8,
      easing: (t) => 1 - Math.pow(1 - t, 4), // ease-out quart
    });
  } else {
    el.scrollIntoView({ behavior: 'smooth' });
  }
};

          // Delay to allow mobile nav close animation to finish
          setTimeout(doScroll, 400);
          window.history.pushState(null, '', to);
          return;
        }

        go(to);
      }}
    >
      {children}
    </a>
  );
}
