import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';
import HOMEPAGE from '../../../data/homePage.json';
import { prefersReducedMotion } from '@utils/helpers';
import { useSwipe } from '@ui/utils/useSwipe.js';

const testimonialsData = HOMEPAGE.testimonials;

const EYEBROW = 'What clients say';
const ADVANCE_MS = 10000;
const FADE_OUT_MS = 320;
const WORD_MS = 600;
const WORD_STEP_MS = 14;
const WORD_MAX_DELAY_MS = 700;
const WORD_EASING = 'cubic-bezier(0.2, 0.7, 0.2, 1)';
const REDUCED_FADE_MS = 200;
const WORD_KEYFRAMES = [
  { opacity: 0, filter: 'blur(0.375rem)', transform: 'translateY(0.35em)' },
  { opacity: 1, filter: 'blur(0)', transform: 'translateY(0)' },
];

/**
 * One quote at a time, with the people below as tabs. The quote advances every 10 seconds
 * while the section is on screen, and the active person's top line fills as the timer runs.
 * Hovering with a mouse pauses both. On phones only the active name is shown and a swipe
 * changes the quote.
 */
export function TestimonialsSection({ className = '', testimonials = testimonialsData }) {
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState(null);
  const sectionRef = useRef(null);
  const quoteRefs = useRef([]);
  const progressRefs = useRef([]);
  const timerRef = useRef(null);
  const pausedRef = useRef({ hover: false, offscreen: true });
  const shownRef = useRef(active);
  const activeRef = useRef(active);
  activeRef.current = active;

  const syncTimer = () => {
    const timer = timerRef.current;
    if (!timer) return;
    const { hover, offscreen } = pausedRef.current;
    if (hover || offscreen) timer.pause();
    else if (timer.playState === 'paused') timer.play();
  };

  const goTo = index => {
    if (index === active) {
      // The same person again restarts their 10 seconds
      if (timerRef.current) timerRef.current.currentTime = 0;
      return;
    }
    setLeaving(active);
    setActive(index);
  };

  // The old quote fades out, then the new one comes in word by word
  useLayoutEffect(() => {
    if (shownRef.current === active) return;
    shownRef.current = active;
    const quote = quoteRefs.current[active];
    quote.getAnimations({ subtree: true }).forEach(animation => animation.cancel());

    if (prefersReducedMotion()) {
      quote.animate([{ opacity: 0 }, { opacity: 1 }], { duration: REDUCED_FADE_MS });
      return;
    }
    quote.querySelectorAll('.testimonials-word').forEach((word, index) => {
      word.animate(WORD_KEYFRAMES, {
        duration: WORD_MS,
        delay: FADE_OUT_MS + Math.min(index * WORD_STEP_MS, WORD_MAX_DELAY_MS),
        easing: WORD_EASING,
        fill: 'backwards',
      });
    });
  }, [active]);

  // The leaving quote stays in place while its fade-out plays
  useEffect(() => {
    if (leaving === null) return undefined;
    const timeout = setTimeout(
      () => setLeaving(null),
      prefersReducedMotion() ? REDUCED_FADE_MS : FADE_OUT_MS
    );
    return () => clearTimeout(timeout);
  }, [leaving]);

  // The active person's line fills over 10 seconds, then the next quote comes up. Reduced
  // motion gets no auto-advance
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const timer = progressRefs.current[active].animate(
      [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }],
      { duration: ADVANCE_MS, easing: 'linear', fill: 'forwards' }
    );
    timer.onfinish = () => {
      setLeaving(active);
      setActive((active + 1) % testimonials.length);
    };
    timerRef.current = timer;
    const { hover, offscreen } = pausedRef.current;
    if (hover || offscreen) timer.pause();
    return () => {
      timer.cancel();
      timerRef.current = null;
    };
  }, [active, testimonials.length]);

  // Paused while a mouse is over the section (not on touch screens) and while it is off screen
  useEffect(() => {
    const section = sectionRef.current;
    const canHover = window.matchMedia('(hover: hover)');
    const onEnter = () => {
      if (!canHover.matches) return;
      pausedRef.current.hover = true;
      syncTimer();
    };
    const onLeave = () => {
      pausedRef.current.hover = false;
      syncTimer();
    };
    const observer = new IntersectionObserver(([entry]) => {
      pausedRef.current.offscreen = !entry.isIntersecting;
      syncTimer();
    });
    section.addEventListener('pointerenter', onEnter);
    section.addEventListener('pointerleave', onLeave);
    observer.observe(section);
    return () => {
      section.removeEventListener('pointerenter', onEnter);
      section.removeEventListener('pointerleave', onLeave);
      observer.disconnect();
    };
  }, []);

  useSwipe(sectionRef, delta => {
    const current = activeRef.current;
    const next = (current + delta + testimonials.length) % testimonials.length;
    if (next === current) return;
    setLeaving(current);
    setActive(next);
  });

  return (
    <section
      id="testimonials"
      ref={sectionRef}
      className={`section_testimonials ${className}`.trim()}
      data-animate-scope
      data-animate-trigger="scroll"
      data-animate-default-preset="fade-up"
    >
      <p className="testimonials-eyebrow" data-animate="fade-up">
        {EYEBROW}
      </p>

      {/* Screen readers hear the active quote here; the animated copy below is decorative */}
      <p className="testimonials-live" aria-live="polite">
        {testimonials[active].quote} {testimonials[active].name}, {testimonials[active].role}
      </p>

      <div className="testimonials-stage" data-animate="fade-up" aria-hidden="true">
        {testimonials.map((testimonial, index) => (
          <blockquote
            key={testimonial.name}
            ref={element => {
              quoteRefs.current[index] = element;
            }}
            className={`testimonials-quote${index === active ? ' is-active' : ''}${
              index === leaving ? ' is-leaving' : ''
            }`}
          >
            <p>
              {testimonial.quote.split(' ').map((word, wordIndex) => (
                <Fragment key={wordIndex}>
                  {wordIndex > 0 ? ' ' : null}
                  <span className="testimonials-word">{word}</span>
                </Fragment>
              ))}
            </p>
          </blockquote>
        ))}
      </div>

      <div
        className="testimonials-people"
        data-animate="fade-up"
        style={{ '--testimonials-count': testimonials.length }}
      >
        {testimonials.map((testimonial, index) => (
          <button
            key={testimonial.name}
            type="button"
            className={`testimonials-person${index === active ? ' is-active' : ''}`}
            onClick={() => goTo(index)}
            aria-pressed={index === active}
          >
            <span
              className="testimonials-progress"
              ref={element => {
                progressRefs.current[index] = element;
              }}
              aria-hidden="true"
            />
            <span className="testimonials-person-name">{testimonial.name}</span>
            <span className="testimonials-person-role">{testimonial.role}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

export { testimonialsData };
