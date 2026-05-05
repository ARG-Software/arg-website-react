import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useContext } from 'react';
import { TransitionContext } from '../providers/TransitionProvider';

gsap.registerPlugin(ScrollTrigger);

export function useNextProjectSection(sectionRef, progressRef, nextSlug) {
  const { go } = useContext(TransitionContext);
  const triggeredRef = useRef(false);
  const scrollTriggerRef = useRef(null);

  useEffect(() => {
    const section = sectionRef?.current;
    const progressContainer = progressRef?.current;
    const progressBar = progressContainer?.querySelector('.prp-scroll-progress-bar');
    if (!section || !progressContainer || !progressBar) return;

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
            go(`/projects/${nextSlug}`, { scrollMode: 'top' });
          }
        },
        onLeave: () => {
          if (triggeredRef.current) return;
          triggeredRef.current = true;
          scrollTriggerRef.current?.kill();
          go(`/projects/${nextSlug}`, { scrollMode: 'top' });
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
  }, [sectionRef, progressRef, nextSlug, go]);
}
