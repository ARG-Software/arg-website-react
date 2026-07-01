import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useContext } from 'react';
import { TransitionContext } from '../providers/TransitionProvider';
import { trackEvent } from '../utils/analytics';

gsap.registerPlugin(ScrollTrigger);

const AUTO_NEXT_SCROLL_KEYS = new Set(['ArrowDown', 'PageDown', 'End', ' ']);

function isAutoNextKey(event) {
  return AUTO_NEXT_SCROLL_KEYS.has(event.key);
}

export function useNextProjectSection(sectionRef, progressRef, nextProject) {
  const { go } = useContext(TransitionContext);
  const triggeredRef = useRef(false);
  const allowAutoNextRef = useRef(false);
  const scrollTriggerRef = useRef(null);
  const touchStartYRef = useRef(null);
  const nextSlug = nextProject?.slug;

  useEffect(() => {
    if (!nextSlug) return;

    const section = sectionRef?.current;
    const progressContainer = progressRef?.current;
    const progressBar = progressContainer?.querySelector('.prp-scroll-progress-bar');
    if (!section || !progressContainer || !progressBar) return;

    const getNextProjectTransitionOptions = () => {
      const image = section.querySelector('.prp-next-bg-img');
      const rect = image?.getBoundingClientRect();
      if (!image || !rect) return { scrollMode: 'top' };

      return {
        scrollMode: 'top',
        transition: 'project-image',
        sourceImage: {
          src: nextProject.imgSrc || image.currentSrc || image.src,
          srcSet: nextProject.imgSrcSet,
          sizes: '100vw',
          rect: {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          },
        },
      };
    };

    const navigateToNextProject = () => {
      if (triggeredRef.current) return;
      if (!allowAutoNextRef.current) return;
      triggeredRef.current = true;
      scrollTriggerRef.current?.kill();
      trackEvent('project_next_auto', { to_project: nextSlug });
      go(`/projects/${nextSlug}`, getNextProjectTransitionOptions());
    };

    const enableAutoNext = () => {
      allowAutoNextRef.current = true;
      if (scrollTriggerRef.current?.progress >= 0.98) {
        navigateToNextProject();
      }
    };

    const enableAutoNextFromWheel = event => {
      if (event.deltaY > 0) enableAutoNext();
    };

    const rememberTouchStart = event => {
      touchStartYRef.current = event.touches?.[0]?.clientY ?? null;
    };

    const enableAutoNextFromTouch = event => {
      const startY = touchStartYRef.current;
      const currentY = event.touches?.[0]?.clientY;
      if (startY !== null && currentY !== undefined && currentY < startY) {
        enableAutoNext();
      }
    };

    const enableAutoNextFromKey = event => {
      if (isAutoNextKey(event)) enableAutoNext();
    };

    triggeredRef.current = false;
    allowAutoNextRef.current = false;
    touchStartYRef.current = null;
    gsap.set(progressContainer, { yPercent: 100, opacity: 0 });
    gsap.set(progressBar, { scaleX: 0, transformOrigin: 'left center' });

    window.addEventListener('wheel', enableAutoNextFromWheel, { passive: true });
    window.addEventListener('touchstart', rememberTouchStart, { passive: true });
    window.addEventListener('touchmove', enableAutoNextFromTouch, { passive: true });
    window.addEventListener('keydown', enableAutoNextFromKey);

    const ctx = gsap.context(() => {
      scrollTriggerRef.current = ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom bottom',
        scrub: true,
        onToggle: self => {
          if (triggeredRef.current) return;
          if (self.isActive) {
            gsap.to(progressContainer, {
              yPercent: 0,
              opacity: 1,
              duration: 0.3,
              ease: 'power2.out',
            });
          } else {
            gsap.to(progressContainer, {
              yPercent: 100,
              opacity: 0,
              duration: 0.3,
              ease: 'power2.in',
            });
          }
        },
        onUpdate: self => {
          if (triggeredRef.current) return;
          gsap.set(progressBar, { scaleX: self.progress });
          if (self.progress >= 0.98) {
            navigateToNextProject();
          }
        },
        onLeave: () => {
          if (triggeredRef.current) return;
          navigateToNextProject();
        },
        onLeaveBack: () => {
          triggeredRef.current = false;
        },
      });
    }, section);

    return () => {
      window.removeEventListener('wheel', enableAutoNextFromWheel);
      window.removeEventListener('touchstart', rememberTouchStart);
      window.removeEventListener('touchmove', enableAutoNextFromTouch);
      window.removeEventListener('keydown', enableAutoNextFromKey);
      if (scrollTriggerRef.current) scrollTriggerRef.current.kill();
      scrollTriggerRef.current = null;
      ctx.revert();
    };
  }, [sectionRef, progressRef, nextProject, nextSlug, go]);
}
