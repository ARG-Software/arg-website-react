// Attribute-based animation presets
import { DEFAULT_THRESHOLD, DEFAULT_ROOT_MARGIN, MOBILE_BREAKPOINT } from '../constants/ui.js';

export { DEFAULT_THRESHOLD, DEFAULT_ROOT_MARGIN, MOBILE_BREAKPOINT };

export const ANIMATION_PRESETS = {
  fadeUp: 'fade-up',
  slideUp: 'slide-up',
  widthCountup: 'width-countup',
  overlayReveal: 'overlay-reveal',
  slideUpRotate: 'slide-up-rotate',
  slideInRight: 'slide-in-right',
  slideInLeft: 'slide-in-left',
  dividerExpanderShow: 'divider-expander-show',
  titleReveal: 'title-reveal',
  slideFromLeft: 'slide-from-left',
  solutionItem: 'solution-item',
  tagPop: 'tag-pop',
  gsapScale: 'gsap-scale',
  // Hover presets, styled in hover.css
  slotText: 'slot-text',
  lift: 'lift',
  circleGrow: 'circle-grow',
};

// Preset configurations
export const ATTRIBUTE_PRESETS = {
  // Basic fade up with optional stagger
  [ANIMATION_PRESETS.fadeUp]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 2rem, 0)',
    transition: 'opacity 0.8s var(--ease-out-cubic), transform 0.8s var(--ease-out-cubic)',
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
  },

  // Slide up from bottom (100%)
  [ANIMATION_PRESETS.slideUp]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 100%, 0)',
    transition: 'opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo)',
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  },

  // Width expansion with count-up (for stats)
  [ANIMATION_PRESETS.widthCountup]: {
    threshold: 0.3,
    rootMargin: '0px 0px -10% 0px',
    transition: 'width 1s var(--ease-out-expo)',
    countUpDuration: 2500, // ms
  },

  // Overlay height collapse (team images)
  [ANIMATION_PRESETS.overlayReveal]: {
    threshold: 0.1,
    rootMargin: DEFAULT_ROOT_MARGIN,
    transition: 'height 0.9s var(--ease-out-expo)',
  },

  // Slide up with fixed 5deg rotation (distance configurable via data-animate-distance)
  [ANIMATION_PRESETS.slideUpRotate]: {
    initialTransform: 'translate3d(0, var(--distance, 100%), 0) rotateZ(5deg)',
    transition: 'transform 0.8s var(--ease-out-cubic)',
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
  },

  // Slide in from right
  [ANIMATION_PRESETS.slideInRight]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(50%, 0, 0)',
    transition: 'opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo)',
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  },

  // Slide in from left
  [ANIMATION_PRESETS.slideInLeft]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(-50%, 0, 0)',
    transition: 'opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo)',
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  },

  // Horizontal scale animation (divider expand)
  [ANIMATION_PRESETS.dividerExpanderShow]: {
    initialTransform: 'scale3d(0.1, 1, 1)',
    transition: 'transform 0.8s var(--ease-out-cubic)',
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
  },

  // Project detail: title reveal (slide up with slight overshoot)
  [ANIMATION_PRESETS.titleReveal]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 40px, 0)',
    transition: 'opacity 0.8s var(--ease-out-expo), transform 0.8s var(--ease-out-expo)',
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  },

  // Project detail: slide from left (section labels)
  [ANIMATION_PRESETS.slideFromLeft]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(-30px, 0, 0)',
    transition: 'opacity 0.6s var(--ease-out-expo), transform 0.6s var(--ease-out-expo)',
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  },

  // Project detail: solution list items (staggered slide from left)
  [ANIMATION_PRESETS.solutionItem]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(-20px, 0, 0)',
    transition: 'opacity 0.5s var(--ease-out-expo), transform 0.5s var(--ease-out-expo)',
    threshold: 0.1,
    rootMargin: '0px 0px -5% 0px',
  },

  // Project detail: tag pop-in (scale from 0.8)
  [ANIMATION_PRESETS.tagPop]: {
    initialOpacity: '0',
    initialTransform: 'scale(0.8)',
    transition: 'opacity 0.4s ease, transform 0.4s var(--ease-out-back)',
    threshold: 0.1,
    rootMargin: '0px 0px -5% 0px',
  },

  // GSAP scale on scroll (for images)
  [ANIMATION_PRESETS.gsapScale]: {
    threshold: 0,
    rootMargin: '0px',
  },
};

// Hover preset settings read by components; presets that are pure CSS (lift, circle-grow)
// keep their settings as custom properties in hover.css
export const HOVER_PRESETS = {
  // Each letter rolls up like a slot machine reel, one after another, and the letters that
  // roll in carry the brand gradient across the word
  [ANIMATION_PRESETS.slotText]: {
    duration: '0.4s',
    stagger: '0.015s',
    ease: 'var(--ease-out-expo)',
    colors: ['var(--arg-color-red)', 'var(--arg-color-magenta)', 'var(--arg-color-violet)'],
  },
};
