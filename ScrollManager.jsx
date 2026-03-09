// ScrollManager.jsx
import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollManager() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    // If the URL has a hash, scroll to that id (works across pages, ex: "/#testimonials")
    if (hash) {
      const id = hash.slice(1);

      let tries = 0;
      const maxTries = 90; // ~1.5s @ 60fps (helps when content mounts after scripts/webflow)

      const tryScroll = () => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ block: "start" });
          return;
        }
        if (tries++ < maxTries) requestAnimationFrame(tryScroll);
      };

      tryScroll();
      return;
    }

    // No hash => always start at top on route change
    window.scrollTo(0, 0);
  }, [pathname, hash]);

  return null;
}
