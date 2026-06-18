import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useContext } from 'react';
import { TransitionContext } from '../providers/TransitionProvider';
import { trackEvent } from './useAnalytics';

gsap.registerPlugin(ScrollTrigger);

export function useNextProjectSection(sectionRef, progressRef, nextProject) {
  const { go } = useContext(TransitionContext);
  const triggeredRef = useRef(false);
  const scrollTriggerRef = useRef(null);
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

    triggeredRef.current = false;
    gsap.set(progressContainer, { yPercent: 100, opacity: 0 });
    gsap.set(progressBar, { scaleX: 0, transformOrigin: 'left center' });

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
            triggeredRef.current = true;
            scrollTriggerRef.current?.kill();
            trackEvent('project_next_auto', { to_project: nextSlug });
            go(`/projects/${nextSlug}`, getNextProjectTransitionOptions());
          }
        },
        onLeave: () => {
          if (triggeredRef.current) return;
          triggeredRef.current = true;
          scrollTriggerRef.current?.kill();
          trackEvent('project_next_auto', { to_project: nextSlug });
          go(`/projects/${nextSlug}`, getNextProjectTransitionOptions());
        },
        onLeaveBack: () => {
          triggeredRef.current = false;
        },
      });
    }, section);

    return () => {
      if (scrollTriggerRef.current) scrollTriggerRef.current.kill();
      scrollTriggerRef.current = null;
      ctx.revert();
    };
  }, [sectionRef, progressRef, nextProject, nextSlug, go]);
}
