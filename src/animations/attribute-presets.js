// Attribute-based animation presets
export const DEFAULT_THRESHOLD = 0.15;
export const DEFAULT_ROOT_MARGIN = '0px 0px -10% 0px';
export const MOBILE_BREAKPOINT = 767; // px

export const ANIMATION_PRESETS = {
  fadeUp: 'fade-up',
  slideUp: 'slide-up',
  widthCountup: 'width-countup',
  overlayReveal: 'overlay-reveal',
  slideUpRotate: 'slide-up-rotate',
  slideInRight: 'slide-in-right',
  dividerExpanderShow: 'divider-expander-show',
  titleReveal: 'title-reveal',
  slideFromLeft: 'slide-from-left',
  solutionItem: 'solution-item',
  tagPop: 'tag-pop',
  gsapScale: 'gsap-scale',
};

// Preset configurations
export const ATTRIBUTE_PRESETS = {
  // Basic fade up with optional stagger
  [ANIMATION_PRESETS.fadeUp]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 2rem, 0)',
    transition:
      'opacity 0.8s cubic-bezier(0.215, 0.61, 0.355, 1), transform 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)',
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
  },

  // Slide up from bottom (100%)
  [ANIMATION_PRESETS.slideUp]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 100%, 0)',
    transition:
      'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  },

  // Width expansion with count-up (for stats)
  [ANIMATION_PRESETS.widthCountup]: {
    threshold: 0.3,
    rootMargin: '0px 0px -10% 0px',
    transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)',
    countUpDuration: 2500, // ms
  },

  // Overlay height collapse (team images)
  [ANIMATION_PRESETS.overlayReveal]: {
    threshold: 0.1,
    rootMargin: DEFAULT_ROOT_MARGIN,
    transition: 'height 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
  },

  // Slide up with fixed 5deg rotation (distance configurable via data-animate-distance)
  [ANIMATION_PRESETS.slideUpRotate]: {
    initialTransform: 'translate3d(0, var(--distance, 100%), 0) rotateZ(5deg)',
    transition: 'transform 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)',
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
  },

  // Slide in from right
  [ANIMATION_PRESETS.slideInRight]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(100%, 0, 0)',
    transition:
      'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  },

  // Horizontal scale animation (divider expand)
  [ANIMATION_PRESETS.dividerExpanderShow]: {
    initialTransform: 'scale3d(0.1, 1, 1)',
    transition: 'transform 0.8s cubic-bezier(0.215, 0.61, 0.355, 1)',
    threshold: DEFAULT_THRESHOLD,
    rootMargin: DEFAULT_ROOT_MARGIN,
  },

  // Project detail: title reveal (slide up with slight overshoot)
  [ANIMATION_PRESETS.titleReveal]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(0, 40px, 0)',
    transition:
      'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  },

  // Project detail: slide from left (section labels)
  [ANIMATION_PRESETS.slideFromLeft]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(-30px, 0, 0)',
    transition:
      'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
  },

  // Project detail: solution list items (staggered slide from left)
  [ANIMATION_PRESETS.solutionItem]: {
    initialOpacity: '0',
    initialTransform: 'translate3d(-20px, 0, 0)',
    transition:
      'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
    threshold: 0.1,
    rootMargin: '0px 0px -5% 0px',
  },

  // Project detail: tag pop-in (scale from 0.8)
  [ANIMATION_PRESETS.tagPop]: {
    initialOpacity: '0',
    initialTransform: 'scale(0.8)',
    transition: 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    threshold: 0.1,
    rootMargin: '0px 0px -5% 0px',
  },

  // GSAP scale on scroll (for images)
  [ANIMATION_PRESETS.gsapScale]: {
    threshold: 0,
    rootMargin: '0px',
  },
};
