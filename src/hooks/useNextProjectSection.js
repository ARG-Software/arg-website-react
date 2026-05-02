import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useContext } from 'react';
import { TransitionContext } from '../providers/TransitionProvider';

gsap.registerPlugin(ScrollTrigger);

export function useNextProjectSection(sectionRef, progressRef, nextSlug) {
  const { go } = useContext(TransitionContext);
  const triggeredRef = useRef(false);
  const scrollProgressRef = useRef(0);

  useEffect(() => {
    const section = sectionRef?.current;
    const progressBar = progressRef?.current;
    if (!section || !progressBar) return;

    triggeredRef.current = false;
    scrollProgressRef.current = 0;

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.5,
        onUpdate: self => {
          if (triggeredRef.current) return;
          scrollProgressRef.current = self.progress;

          gsap.to(progressBar, {
            scaleX: self.progress,
            transformOrigin: 'left center',
            duration: 0.1,
          });

          if (self.progress >= 1) {
            triggeredRef.current = true;
            ScrollTrigger.getAll().forEach(t => t.kill());
            go(`/projects/${nextSlug}`);
          }
        },
      });
    }, section);

    return () => {
      ctx.revert();
    };
  }, [sectionRef, progressRef, nextSlug, go]);
}
