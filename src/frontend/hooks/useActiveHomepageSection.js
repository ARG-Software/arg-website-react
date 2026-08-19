import { useEffect, useRef, useState } from 'react';

const HOMEPAGE_SECTION_IDS = [
  'hero',
  'partners',
  'overview',
  'services',
  'cases',
  'testimonials',
  'working-with-us',
  'team',
  'blog-promo',
  'social',
  'faq',
  'contact',
];

export function useActiveHomepageSection(pathname) {
  const [activeSection, setActiveSection] = useState(null);
  const visibilityRef = useRef(new Map());

  useEffect(() => {
    if (pathname !== '/') {
      visibilityRef.current.clear();
      return undefined;
    }

    const sections = HOMEPAGE_SECTION_IDS.map(id => document.getElementById(id)).filter(Boolean);

    if (sections.length === 0) {
      return undefined;
    }

    visibilityRef.current.clear();
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          visibilityRef.current.set(
            entry.target.id,
            entry.isIntersecting ? entry.intersectionRatio : 0
          );
        }

        const nextSection = Array.from(visibilityRef.current.entries()).reduce(
          (current, [sectionId, ratio]) => (ratio > current.ratio ? { sectionId, ratio } : current),
          { sectionId: null, ratio: 0 }
        ).sectionId;

        setActiveSection(current => (current === nextSection ? current : nextSection));
      },
      { threshold: [0, 0.25, 0.5, 0.75], rootMargin: '-15% 0px -40%' }
    );

    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [pathname]);

  return pathname === '/' ? activeSection : null;
}
